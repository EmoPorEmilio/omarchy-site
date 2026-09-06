param([Parameter(Mandatory=$true)][string]$RequestPath)

# Connect to the user's Blender MCP add-on on the Windows side of WSL.
# Blender's official extension uses null-delimited JSON messages.
$ErrorActionPreference = 'Stop'
$client = [System.Net.Sockets.TcpClient]::new()
try {
    $client.Connect('127.0.0.1', 9876)
    $stream = $client.GetStream()
    $stream.ReadTimeout = 120000
    $request = [System.IO.File]::ReadAllText($RequestPath)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($request + [char]0)
    $stream.Write($bytes, 0, $bytes.Length)
    $buffer = New-Object byte[] 65536
    $response = [System.IO.MemoryStream]::new()
    while (($count = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $response.Write($buffer, 0, $count)
        $text = [System.Text.Encoding]::UTF8.GetString($response.ToArray()).TrimEnd([char]0)
        try { $null = ConvertFrom-Json -InputObject $text -ErrorAction Stop }
        catch { continue }
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        [Console]::WriteLine($text)
        break
    }
} finally {
    $client.Dispose()
}
