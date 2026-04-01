Write-Host "Starting Bekaei CodeLab server..."

# Set execution policy for the current process only (doesn't require admin)
$currentPolicy = Get-ExecutionPolicy
try {
    # Set execution policy to Bypass for this process
    Set-ExecutionPolicy Bypass -Scope Process -Force | Out-Null

    # Start the server
    Write-Host "🚀 Starting server..."
    node server.js

    Write-Host "Server started successfully!"
}
catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
}
finally {
    # Restore original execution policy
    if ($currentPolicy) {
        Set-ExecutionPolicy $currentPolicy -Scope Process -Force | Out-Null
    }
}
