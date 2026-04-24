#!/usr/bin/env python3
"""Search bridge: called from Node.js to perform web searches via ddgs library.

Single query:  python3 search_bridge.py '<query>'
Batch queries: python3 search_bridge.py --batch '<json array of queries>'

Output: JSON {"results": [...], "error": null}
   or for batch: [{"query": "...", "results": [...], "error": null}, ...]
"""
import json
import sys


def search_single(ddgs_instance, query: str, max_results: int = 5, retries: int = 3) -> dict:
    last_err = None
    for attempt in range(retries + 1):
        try:
            raw = ddgs_instance.text(query, max_results=max_results) or []
            results = [
                {
                    "title": r.get("title", ""),
                    "href": r.get("href", ""),
                    "body": r.get("body", ""),
                }
                for r in raw
            ]
            return {"query": query, "results": results, "error": None}
        except Exception as e:
            last_err = e
            continue

    return {"query": query, "results": [], "error": f"{type(last_err).__name__}: {str(last_err)[:200]}"}


def main():
    try:
        from ddgs import DDGS
    except ImportError:
        print(json.dumps({"results": [], "error": "ddgs not installed"}))
        sys.exit(0)

    d = DDGS()

    if len(sys.argv) >= 3 and sys.argv[1] == "--batch":
        queries = json.loads(sys.argv[2])
        results = [search_single(d, q) for q in queries]
        print(json.dumps(results))
    elif len(sys.argv) >= 2:
        query = sys.argv[1]
        result = search_single(d, query)
        print(json.dumps(result))
    else:
        print(json.dumps({"results": [], "error": "no query"}))


if __name__ == "__main__":
    main()
