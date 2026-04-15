param(
  [Parameter(Mandatory = $true)]
  [string]$Bucket,

  [string]$Region = $env:AWS_REGION
)

if (-not $Region) {
  throw "Set AWS_REGION or pass -Region before publishing static files."
}

$root = Split-Path -Parent $PSScriptRoot
$staticDir = Join-Path $root "static"

if (Test-Path $staticDir) {
  aws s3 sync $staticDir "s3://$Bucket/" --region $Region --delete
}

Get-ChildItem -Path $root -Filter *.html | ForEach-Object {
  aws s3 cp $_.FullName "s3://$Bucket/$($_.Name)" --region $Region --content-type "text/html"
}
