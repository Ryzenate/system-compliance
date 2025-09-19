# PowerShell script to retrieve full Windows OS version and build
# Run with elevated privileges if necessary
#Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned


# PowerShell script to retrieve Windows OS build and revision
# Outputs format: <CurrentBuild>.<UBR>, e.g., 26100.6584
# Run with elevated privileges if necessary

try {
    # Get OS version information from registry
    $os = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion"
    
    # Extract version components
    $buildNumber = $os.CurrentBuild  # e.g., 26100
    $revision = $os.UBR  # e.g., 6584

    # Format output as "<CurrentBuild>.<UBR>"
    $versionString = "$buildNumber.$revision"
    Write-Output $versionString
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}

# try {
#     # Get OS version information from registry
#     $os = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion"
    
#     # Extract version components
#     $releaseId = $os.ReleaseId  # e.g., 24H2
#     $buildNumber = $os.CurrentBuild  # e.g., 26100
#     $revision = $os.UBR  # e.g., 6584

#     # Format output as "Version 24H2 (OS Build 26100.6584)"
#     $versionString = "Version $releaseId (OS Build $buildNumber.$revision)"
#     Write-Output $versionString
# } catch {
#     Write-Output "Error: $($_.Exception.Message)"
# }