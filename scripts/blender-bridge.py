"""Call the installed Blender MCP add-on through Windows localhost from WSL.

python3 scripts/blender-bridge.py get_scene_info
python3 scripts/blender-bridge.py execute_code --code-file path/to/script.py

This does not change Blender settings or install another MCP server.
"""
import argparse
import json
import pathlib
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('command', nargs='?', default='get_scene_info')
parser.add_argument('--code-file', type=pathlib.Path)
parser.add_argument('--params', default='{}')
args = parser.parse_args()
params = json.loads(args.params)
if args.code_file:
    params['code'] = args.code_file.read_text()
if args.command == 'get_scene_info':
    params['code'] = "import bpy\nresult = {'version': bpy.app.version_string, 'file': bpy.data.filepath, 'scene': bpy.context.scene.name, 'objects': [{'name': o.name, 'type': o.type} for o in bpy.context.scene.objects]}"
if 'code' not in params:
    raise SystemExit('Provide --code-file or use get_scene_info')

def windows_path(path):
    return subprocess.check_output(['wslpath', '-w', str(path)], text=True).strip()

bridge = pathlib.Path(__file__).resolve().with_suffix('.ps1')
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', encoding='utf-8') as request:
    json.dump({'type': 'execute', 'code': params['code'], 'strict_json': True}, request)
    request.flush()
    result = subprocess.run([
        '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', windows_path(bridge),
        '-RequestPath', windows_path(request.name),
    ], capture_output=True, text=True)
    if result.stdout:
        print(result.stdout.lstrip('\ufeff').strip())
    if result.returncode:
        raise SystemExit(result.stderr.strip() or result.returncode)
