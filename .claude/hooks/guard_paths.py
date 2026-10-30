#!/usr/bin/env python3
"""PreToolUse guard — applica i vincoli strutturali non negoziabili degli standard.

Blocca scritture che violano:
  - S08  data/raw/ e' immutabile (nessuna modifica manuale ai dati originali)
  - S04/S05  .env non viene mai scritto/committato (usare .env.example)
  - S03  nessun notebook (.ipynb) dentro src/

I vincoli sono implementati nel codice, non delegati alla decisione dell'LLM
(coerente con il principio degli S18/S19 sui sistemi agentici).

Contratto hook: legge il payload JSON da stdin. Per bloccare l'azione esce con
codice 2 e scrive la motivazione su stderr (mostrata a Claude). Negli altri casi
esce 0 e lascia procedere.
"""
import json
import os
import sys


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # input non parsabile: non bloccare

    tool_input = payload.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path") or tool_input.get("path") or ""
    if not file_path:
        return 0

    cwd = payload.get("cwd") or os.getcwd()
    abs_path = file_path if os.path.isabs(file_path) else os.path.join(cwd, file_path)
    norm = abs_path.replace(os.sep, "/")
    rel = os.path.relpath(abs_path, cwd).replace(os.sep, "/")
    basename = os.path.basename(norm)

    # --- S08: data/raw/ immutabile ---------------------------------------
    # Si blocca la modifica di file gia' esistenti. La creazione di nuovi
    # file raw e' permessa (ingestion), ma editare un raw esistente no.
    if "/data/raw/" in norm or rel.startswith("data/raw/"):
        if os.path.exists(abs_path):
            sys.stderr.write(
                "BLOCCATO (S08 - Data Reproducibility): data/raw/ e' in sola "
                "lettura. I dati raw sono immutabili: nessuna modifica manuale.\n"
                "Se serve trasformare i dati, scrivi uno script in src/ che "
                "produca l'output in data/processed/.\n"
            )
            return 2

    # --- S04/S05: mai scrivere .env --------------------------------------
    if basename == ".env" or basename.startswith(".env.") and not basename.endswith(".example"):
        sys.stderr.write(
            "BLOCCATO (S04/S05 - Configuration Management): il file .env non va "
            "scritto ne' committato. Documenta le variabili in .env.example "
            "(senza valori reali) e tieni .env in .gitignore.\n"
        )
        return 2

    # --- S03: nessun notebook in src/ ------------------------------------
    if basename.endswith(".ipynb") and ("/src/" in norm or rel.startswith("src/")):
        sys.stderr.write(
            "BLOCCATO (S03 - Repository Structure): i notebook non vivono in "
            "src/. L'esplorazione sta in notebooks/; src/ contiene solo moduli "
            "Python strutturati e testabili.\n"
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
