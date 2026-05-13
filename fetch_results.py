import math
import time
import urllib.request
import urllib.error
import http.cookiejar
import json
import sys

def fetch_all_nyrr_results(event_code="B2025", page_size=100):
    url = "https://rmsprodapi.nyrr.org/api/v2/runners/finishers-filter"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    def post_request(search_str, page):
        payload = {
            "eventCode": event_code,
            "searchString": search_str,
            "handicap": None,
            "sortColumn": "overallTime",
            "sortDescending": False,
            "pageIndex": page,
            "pageSize": page_size
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with opener.open(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            raise Exception(f"HTTP {e.code}: {e.reason} - {err_body}")

    runners = {}
    
    # First check if we can just get total count
    try:
        init_res = post_request(None, 1)
        total_target = init_res.get("totalItems", 0)
        print(f"Overall Total Finishers in Event: {total_target}\n", flush=True)
    except Exception as e:
        print(f"Error fetching initial stats: {e}")
        total_target = "Unknown"
    
    # Queue of prefixes to search
    queue = [chr(c) for c in range(ord('A'), ord('Z') + 1)]
    
    while queue:
        prefix = queue.pop(0)
        print(f"Inspecting prefix: '{prefix}'...", flush=True)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                res = post_request(prefix, 1)
                break
            except Exception as e:
                print(f"Attempt {attempt+1} failed for prefix '{prefix}': {e}", flush=True)
                time.sleep(1)
        else:
            print(f"Skipping prefix '{prefix}' due to errors.", flush=True)
            continue
            
        total_items = res.get("totalItems", 0)
        print(f"Prefix '{prefix}' found {total_items} runners.", flush=True)
        
        if total_items == 0:
            continue
            
        if total_items <= 500 or len(prefix) >= 4:
            # Fetch all pages for this prefix up to the allowed limit
            items = res.get("items", [])
            for item in items:
                runners[item["runnerId"]] = item
                
            total_pages = math.ceil(total_items / page_size)
            # If it exceeds 500 but prefix is long, we cap at 5 pages to avoid crash
            pages_to_fetch = min(total_pages, 5)
            
            for page in range(2, pages_to_fetch + 1):
                for attempt in range(max_retries):
                    try:
                        p_res = post_request(prefix, page)
                        for item in p_res.get("items", []):
                            runners[item["runnerId"]] = item
                        break
                    except Exception as e:
                        time.sleep(1)
                time.sleep(0.1)
        else:
            # Total items > 500, split further
            sub_prefixes = [prefix + chr(c) for c in range(ord('A'), ord('Z') + 1)]
            queue.extend(sub_prefixes)
            
        print(f"Unique runners collected so far: {len(runners)} / {total_target}\n", flush=True)
        time.sleep(0.1)
        
    return list(runners.values())

if __name__ == "__main__":
    runners = fetch_all_nyrr_results()
    output_file = "brooklyn_half_2025_results.json"
    
    print(f"\nSaving {len(runners)} unique results to {output_file}...", flush=True)
    with open(output_file, "w") as f:
        json.dump(runners, f, indent=2)
        
    print("Done!", flush=True)
