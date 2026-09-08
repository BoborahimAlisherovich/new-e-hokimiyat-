from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable
from urllib.parse import unquote

from django.conf import settings

CYRILLIC_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "j",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "x",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sh",
    "ъ": "'",
    "ы": "i",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
    "ў": "o'",
    "қ": "q",
    "ғ": "g'",
    "ҳ": "h",
    "А": "A",
    "Б": "B",
    "В": "V",
    "Г": "G",
    "Д": "D",
    "Е": "E",
    "Ё": "Yo",
    "Ж": "J",
    "З": "Z",
    "И": "I",
    "Й": "Y",
    "К": "K",
    "Л": "L",
    "М": "M",
    "Н": "N",
    "О": "O",
    "П": "P",
    "Р": "R",
    "С": "S",
    "Т": "T",
    "У": "U",
    "Ф": "F",
    "Х": "X",
    "Ц": "Ts",
    "Ч": "Ch",
    "Ш": "Sh",
    "Щ": "Sh",
    "Ъ": "'",
    "Ы": "I",
    "Ь": "",
    "Э": "E",
    "Ю": "Yu",
    "Я": "Ya",
    "Ў": "O'",
    "Қ": "Q",
    "Ғ": "G'",
    "Ҳ": "H",
}

PATH_TAG_REGEX = re.compile(r"<path\b[^>]*>", re.IGNORECASE)
CLASS_REGEX = re.compile(r'class="([^"]+)"', re.IGNORECASE)
NAME_REGEX = re.compile(r"highcharts-name-([^\s\"]+)", re.IGNORECASE)


def default_map_path() -> Path:
    return Path(settings.BASE_DIR).parent / "app" / "dashboard" / "analytics" / "kharita.html"


def convert_to_latin(text: str) -> str:
    return "".join(CYRILLIC_TO_LATIN.get(char, char) for char in text)


def capitalize(text: str) -> str:
    if not text:
        return text
    return text[:1].upper() + text[1:]


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^\w-]+", "-", value, flags=re.UNICODE)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


def extract_map_region_names(html: str) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for tag in PATH_TAG_REGEX.findall(html):
        class_match = CLASS_REGEX.search(tag)
        if not class_match:
            continue
        class_value = class_match.group(1)
        name_match = NAME_REGEX.search(class_value)
        if not name_match:
            continue
        raw_name = name_match.group(1)
        name = unquote(raw_name) if "%" in raw_name else raw_name
        if name in seen:
            continue
        seen.add(name)
        names.append(name)
    return names


def load_map_region_names(map_path: Path | None = None) -> list[str]:
    resolved_path = map_path or default_map_path()
    if not resolved_path.exists():
        return []
    html = resolved_path.read_text("utf-8")
    return extract_map_region_names(html)


def build_region_fields(raw_name: str, order: int) -> dict[str, str | int | bool]:
    normalized = raw_name.replace("-", " ")
    name_uz = capitalize(convert_to_latin(normalized))
    name_ru = capitalize(normalized)
    code = slugify(name_uz) or slugify(raw_name)
    return {
        "name_uz": name_uz,
        "name_ru": name_ru,
        "name_en": "",
        "code": code,
        "order": order,
        "is_active": True,
    }


def iter_region_fields(names: Iterable[str]) -> list[dict[str, str | int | bool]]:
    return [build_region_fields(name, order=index) for index, name in enumerate(names, 1)]
