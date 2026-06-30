import os
import re

base_dir = "."
case_studies = ["FIPA", "HRMS", "HealthCare", "RoundMart", "VirtualExpo"]

def extract_used_images(html_content):
    # Find all src="path/to/image.png"
    return set(re.findall(r'src=["\']([^"\']+)["\']', html_content))

for cs in case_studies:
    cs_dir = os.path.join(base_dir, cs)
    html_file = os.path.join(cs_dir, "index.html")
    if not os.path.exists(html_file):
        html_file = os.path.join(cs_dir, "case_study.html")
        if not os.path.exists(html_file):
            continue
            
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    used_images = extract_used_images(content)
    # Convert all used image paths to just the basenames to be safe
    used_basenames = set(os.path.basename(img) for img in used_images)
    
    hifi_dir = os.path.join(cs_dir, "image", "High-Fidelity-Interface")
    for sub in ["Web", "Mobile"]:
        sub_dir = os.path.join(hifi_dir, sub)
        if os.path.exists(sub_dir):
            for filename in os.listdir(sub_dir):
                if filename.endswith(".png") or filename.endswith(".jpg") or filename.endswith(".jpeg"):
                    if filename not in used_basenames:
                        file_path = os.path.join(sub_dir, filename)
                        print(f"Removing unused image: {file_path}")
                        os.remove(file_path)

print("Cleanup complete.")
