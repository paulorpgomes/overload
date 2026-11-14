"""Generate the versioned TACO food seed without third-party Python packages.

Download the official Excel file linked at
https://nepa.unicamp.br/tabela-brasileira-de-composicao-de-alimentos-4a-edicao/
and run: python3 scripts/generate_taco_seed.py taco-4a.xlsx

Only the main composition sheet is used. TACO's "Tr" (trace) is represented
as zero at this precision; rows with missing kcal or macronutrients are skipped.
"""

from __future__ import annotations

import re
import sys
import zipfile
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE_URL = "https://nepa.unicamp.br/tabela-brasileira-de-composicao-de-alimentos-4a-edicao/"
OUTPUT = Path("supabase/migrations/20261014000001_taco_food_catalog.sql")
ALIASES = {
    3: ["arroz branco", "arroz branco cozido"],
    53: ["pão francês", "pãozinho francês"],
    91: ["batata cozida", "batata inglesa cozida"],
    182: ["banana prata"],
    408: ["peito de frango cozido", "frango cozido"],
    410: ["peito de frango grelhado", "frango grelhado"],
    488: ["ovo cozido"],
    490: ["ovo frito"],
    561: ["feijão carioca", "feijão carioca cozido"],
}


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def nutrient(raw: str | None) -> Decimal | None:
    if raw is None or raw.strip().upper() == "NA":
        return None
    if raw.strip().lower() == "tr":
        return Decimal(0)
    try:
        value = Decimal(raw.strip()).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
    except InvalidOperation:
        return None
    return value if value >= 0 else None


def rows_from_excel(path: Path) -> list[tuple[int, str, Decimal, Decimal, Decimal, Decimal]]:
    with zipfile.ZipFile(path) as archive:
        strings_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        strings = [
            "".join(node.text or "" for node in item.findall(".//x:t", NS))
            for item in strings_root.findall("x:si", NS)
        ]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    foods = []
    for row in sheet.findall("x:sheetData/x:row", NS):
        cells: dict[str, str] = {}
        for cell in row.findall("x:c", NS):
            value = cell.find("x:v", NS)
            if value is None or value.text is None:
                continue
            column = re.match(r"[A-Z]+", cell.attrib["r"])
            if column is None:
                continue
            cells[column.group()] = (
                strings[int(value.text)] if cell.attrib.get("t") == "s" else value.text
            )

        code = cells.get("A", "")
        name = cells.get("B", "").strip()
        if not code.isdigit() or not name:
            continue
        values = [nutrient(cells.get(column)) for column in ("D", "F", "I", "G")]
        if any(value is None for value in values):
            continue
        calories, protein, carb, fat = values
        foods.append((int(code), name, calories, protein, carb, fat))
    return foods


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/generate_taco_seed.py taco-4a.xlsx")
    foods = rows_from_excel(Path(sys.argv[1]))
    if len(foods) < 500 or len({food[0] for food in foods}) != len(foods):
        raise SystemExit(f"Unexpected TACO content: {len(foods)} unique foods")

    lines = [
        "-- Generated from the official TACO 4th edition Excel file (NEPA/Unicamp).",
        f"-- {SOURCE_URL}",
        "-- Values are per 100 g of edible portion. 'Tr' is stored as 0 at 0.001 precision.",
        "-- Regenerate: python3 scripts/generate_taco_seed.py taco-4a.xlsx",
        "insert into public.food_catalog",
        "  (source_code, name, calories_per_100g, protein_per_100g,",
        "   carb_per_100g, fat_per_100g, source_name, source_url, source_version)",
        "values",
    ]
    for index, (code, name, calories, protein, carb, fat) in enumerate(foods):
        suffix = "," if index < len(foods) - 1 else ""
        lines.append(
            "  ("
            + ", ".join(
                (
                    sql_string(f"TACO4:{code}"),
                    sql_string(name),
                    str(calories),
                    str(protein),
                    str(carb),
                    str(fat),
                    sql_string("TACO — NEPA/Unicamp"),
                    sql_string(SOURCE_URL),
                    sql_string("4ª edição"),
                )
            )
            + ")"
            + suffix
        )
    lines.extend(
        [
            "on conflict (source_code) do update set",
            "  name = excluded.name,",
            "  calories_per_100g = excluded.calories_per_100g,",
            "  protein_per_100g = excluded.protein_per_100g,",
            "  carb_per_100g = excluded.carb_per_100g,",
            "  fat_per_100g = excluded.fat_per_100g,",
            "  source_name = excluded.source_name,",
            "  source_url = excluded.source_url,",
            "  source_version = excluded.source_version;",
        ]
    )
    for code, aliases in ALIASES.items():
        lines.append(
            "update public.food_catalog set synonyms = array["
            + ", ".join(sql_string(alias) for alias in aliases)
            + "] where source_code = "
            + sql_string(f"TACO4:{code}")
            + ";"
        )
    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(foods)} foods to {OUTPUT}")


if __name__ == "__main__":
    main()
