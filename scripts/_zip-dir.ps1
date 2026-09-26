# Creates a ZIP archive from the contents of a directory using forward-slash
# entry names, so AWS Lambda (Unix unzip) sees proper nested directories.
#
# PowerShell's built-in Compress-Archive writes backslash separators on some
# versions, which Lambda treats as flat filenames — hence this explicit helper.
#
# Usage:
#   powershell -File _zip-dir.ps1 -SourceDir <dir> -ZipPath <out.zip>
param(
    [Parameter(Mandatory = $true)][string]$SourceDir,
    [Parameter(Mandatory = $true)][string]$ZipPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Normalize to a canonical full path with a trailing separator.
# Using GetFullPath collapses any 8.3 short-name segments so the base
# prefix matches the file paths returned by Get-ChildItem.
$SourceDir = [System.IO.Path]::GetFullPath((Resolve-Path $SourceDir).Path)
$baseUri = New-Object System.Uri(($SourceDir.TrimEnd('\', '/') + '\'))

$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = Get-ChildItem -LiteralPath $SourceDir -Recurse -File -Force
    foreach ($f in $files) {
        # Build a relative entry name with forward slashes using URI math,
        # which is correct on Windows PowerShell 5.1 (no GetRelativePath).
        $fileUri = New-Object System.Uri($f.FullName)
        $rel = [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fileUri).ToString())
        # MakeRelativeUri already yields forward slashes, but normalize anyway.
        $rel = $rel.Replace('\', '/')
        $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
        $in = [System.IO.File]::OpenRead($f.FullName)
        try {
            $out = $entry.Open()
            try { $in.CopyTo($out) } finally { $out.Dispose() }
        } finally { $in.Dispose() }
    }
}
finally {
    $zip.Dispose()
}

Write-Output "Wrote $($files.Count) entries to $ZipPath"
