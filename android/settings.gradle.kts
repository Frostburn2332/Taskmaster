pluginManagement {
    includeBuild("../node_modules/@react-native/gradle-plugin")
}

plugins {
    id("com.facebook.react.settings")
}

// Modern Kotlin syntax for React Native Autolinking
extensions.configure<com.facebook.react.ReactSettingsExtension> {
    autolinkLibrariesFromCommand()
}

rootProject.name = "Taskmaster"

include(":app")

// This ensures the gradle-plugin logic is also included in the build graph
includeBuild("../node_modules/@react-native/gradle-plugin")