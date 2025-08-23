# Test photo upload script
$response = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"username":"admin","password":"admin123"}'
$token = $response.token
Write-Host "Token: $token"

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"photo`"; filename=`"test-image.jpg`"",
    "Content-Type: image/jpeg$LF",
    [System.IO.File]::ReadAllText("test-image.jpg"),
    "--$boundary--$LF"
) -join $LF

try {
    $result = Invoke-RestMethod -Uri http://localhost:5000/api/students/1/photo -Method POST -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    } -Body $bodyLines
    
    Write-Host "Upload successful: $result"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
