# make_dummy_data.py — generates sample 256×256 PNG frames (§5 Assumptions & Stubs)
import numpy as np
from PIL import Image
import os

OUTPUT = "godot/data/dummy_data.png"

def main():
    arr = (np.random.rand(256,256) * 255).astype(np.uint8)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    Image.fromarray(arr, mode='L').save(OUTPUT)
    print(f"Dummy data saved to {OUTPUT}")

if __name__ == "__main__":
    main()
