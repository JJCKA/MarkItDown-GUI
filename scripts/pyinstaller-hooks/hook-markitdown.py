from PyInstaller.utils.hooks import collect_all, collect_submodules

# Collect all markitdown submodules and their data files
datas, binaries, hiddenimports = collect_all('markitdown')

# Ensure all optional converters are included
hiddenimports += collect_submodules('markitdown.converters')

# Additional optional deps
hiddenimports += [
    'mammoth', 'pdfminer', 'pdfminer.six', 'pdfplumber',
    'openpyxl', 'xlrd', 'pandas',
    'beautifulsoup4', 'bs4',
    'pydub', 'speechrecognition',
    'python-docx', 'docx',
    'python-pptx', 'pptx',
    'youtube_transcript_api',
    'PIL', 'PIL.Image',
]
