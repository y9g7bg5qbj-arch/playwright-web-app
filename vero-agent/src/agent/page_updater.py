"""
Page Updater - Parses and updates .vero page files

Automatically updates Page object definitions with newly discovered selectors.
"""
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class PageUpdater:
    """
    Updates .vero page files with new field declarations.
    
    Features:
    - Parse existing .vero files to extract Page definitions
    - Insert new field declarations while preserving formatting
    - Handle multiple pages in a single file
    - Maintain consistent indentation
    """

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.indent = "    "  # 4 spaces

    def find_vero_files(self) -> List[Path]:
        """Find all .vero files in the project."""
        return list(self.project_path.glob("**/*.vero"))

    def parse_page(self, content: str, page_name: str) -> Optional[Dict]:
        """Parse a page definition from content."""
        pattern = rf"page\s+{page_name}\s*\{{([^}}]*)\}}"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            body = match.group(1)
            fields = {}
            field_pattern = r"field\s+(\w+)\s*=\s*\"([^\"]*)\""
            for field_match in re.finditer(field_pattern, body):
                fields[field_match.group(1)] = field_match.group(2)
            return {
                "name": page_name,
                "fields": fields,
                "start": match.start(),
                "end": match.end(),
                "body_start": match.start(1),
                "body_end": match.end(1)
            }
        return None

    def add_field_to_page(self, content: str, page_name: str, field_name: str, selector: str) -> str:
        """Add a new field to an existing page definition."""
        page_info = self.parse_page(content, page_name)
        if not page_info:
            return content
        
        if field_name in page_info["fields"]:
            return content  # Field already exists
        
        new_field = f"{self.indent}field {field_name} = \"{selector}\"
"
        insert_pos = page_info["body_end"]
        
        # Find last field position for proper insertion
        body = content[page_info["body_start"]:page_info["body_end"]]
        last_field = None
        for match in re.finditer(r"field\s+\w+\s*=\s*\"[^\"]*\"", body):
            last_field = match
        
        if last_field:
            insert_pos = page_info["body_start"] + last_field.end()
            new_field = "
" + new_field.rstrip()
        
        return content[:insert_pos] + new_field + content[insert_pos:]

    def update_file(self, file_path: Path, page_name: str, new_fields: Dict[str, str]) -> bool:
        """Update a .vero file with new fields for a page."""
        try:
            content = file_path.read_text()
            original = content
            
            for field_name, selector in new_fields.items():
                content = self.add_field_to_page(content, page_name, field_name, selector)
            
            if content != original:
                file_path.write_text(content)
                return True
            return False
        except Exception as e:
            print(f"Error updating {file_path}: {e}")
            return False

    def create_page(self, page_name: str, fields: Dict[str, str]) -> str:
        """Generate a new page definition."""
        lines = [f"page {page_name} {{"]
        for field_name, selector in fields.items():
            lines.append(f"{self.indent}field {field_name} = \"{selector}\"")
        lines.append("}")
        return "
".join(lines)

    def find_or_create_page_file(self, page_name: str) -> Path:
        """Find existing file with page or create path for new one."""
        for vero_file in self.find_vero_files():
            content = vero_file.read_text()
            if self.parse_page(content, page_name):
                return vero_file
        
        pages_dir = self.project_path / "pages"
        pages_dir.mkdir(exist_ok=True)
        return pages_dir / f"{page_name.lower()}.vero"

