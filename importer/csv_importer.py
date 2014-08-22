#!/usr/bin python
import sys
import csv
import json
import os

def import_csv(path):
    results = []
    with open(path, "rU") as f:
        reader = csv.DictReader(f, ["name", "location"])
        for item in reader:
            item_mod = item.copy()
            item_mod["lat"] = None
            item_mod["lng"] = None
            results.append(item_mod)

    return results

def append_to_json_file(template_path, items):
    """ Append results to a premade json template."""
    with open(template_path, "rw") as f:
        # first lets read the json
        template = json.loads(f.read())
        #tempate should have an items list acessible at data.items
        template['data']['items'] = items
        with open(os.path.splitext(template_path)[0] + "_complete.json", "w") as complete_data:
            complete_data.write(json.dumps(template))

def main(path, template_path=None):
    r = import_csv(path)
    if template_path is not None:
        append_to_json_file(template_path, r)
    

if __name__ == "__main__":
    template_path = None
    if len(sys.argv) == 3:
        template = sys.argv[2]
    main(sys.argv[1], template)



