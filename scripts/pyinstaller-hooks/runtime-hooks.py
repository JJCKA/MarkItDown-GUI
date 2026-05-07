"""PyInstaller runtime hook — ensures backend modules are importable."""
import sys
from pathlib import Path

# In frozen exe, the application path is in sys._MEIPASS
# Add the exe's directory so backend.* imports work
if getattr(sys, 'frozen', False):
    sys.path.insert(0, str(Path(sys.executable).parent))
