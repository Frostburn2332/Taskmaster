plugins {
    id("com.android.application")
    id("com.facebook.react")
    id("org.jetbrains.kotlin.android")
    // This activates the Firebase Google Services plugin
    id("com.google.gms.google-services")
}

apply(from = "../../node_modules/react-native-vector-icons/fonts.gradle")

/**
 * React Native Configuration
 */
react {
    autolinkLibrariesWithApp()
}

/**
 * Proguard and JSC Configuration
 */
val enableProguardInReleaseBuilds = false
// In Kotlin DSL, use double quotes and assign with "="
val jscFlavor = "io.github.react-native-community:jsc-android:2026004.+"

android {
    ndkVersion = rootProject.extra["ndkVersion"] as String
    buildToolsVersion = rootProject.extra["buildToolsVersion"] as String
    compileSdk = (rootProject.extra["compileSdkVersion"] as Number).toInt()

    namespace = "com.taskmaster"
    defaultConfig {
        applicationId = "com.taskmaster"
        minSdk = (rootProject.extra["minSdkVersion"] as Number).toInt()
        targetSdk = (rootProject.extra["targetSdkVersion"] as Number).toInt()
        versionCode = 1
        versionName = "1.0"
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = enableProguardInReleaseBuilds
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")

    // Firebase BoM (Bill of Materials) - manages versions for you
    implementation(platform("com.google.firebase:firebase-bom:34.9.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-analytics")

    val hermesEnabled = project.findProperty("hermesEnabled")?.toString()?.toBoolean() ?: true
    if (hermesEnabled) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation(jscFlavor)
    }
}