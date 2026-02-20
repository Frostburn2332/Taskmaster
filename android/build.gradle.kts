buildscript {
    // In Kotlin DSL, we use 'extra' and the 'set' method
    val buildToolsVersion by extra("36.0.0")
    val minSdkVersion by extra(24)
    val compileSdkVersion by extra(36)
    val targetSdkVersion by extra(36)
    val ndkVersion by extra("27.1.12297006")
    val kotlinVersion by extra("2.1.20")

    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        classpath("com.google.gms:google-services:4.4.2") 
    }
}

// Ensure this uses the Kotlin 'apply' syntax
apply(plugin = "com.facebook.react.rootproject")

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}