from pathlib import Path
from PIL import Image
import io, json, base64

backend = Path(__file__).resolve().parents[1]
project = Path(__file__).resolve().parents[3]
public = project / 'public'
assets = {}
for file in [*sorted((public / 'photos').glob('*.webp')), public / 'avatars.webp', public / 'logo-ws132.webp']:
    image = Image.open(file)
    image.thumbnail((960, 960) if file.parent.name == 'photos' else (640, 640), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, format='WEBP', quality=80, method=4)
    assets['/' + str(file.relative_to(public))] = base64.b64encode(output.getvalue()).decode()
(backend / 'worker' / 'assets.json').write_text(json.dumps(assets, separators=(',', ':')))
print('Protected assets prepared:', len(assets))
