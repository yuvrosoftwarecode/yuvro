# Image Matcher

A standalone utility to calculate a "Visual Similarity Score" between two images (e.g., screenshots).

## Installation

It is recommended to use a Python virtual environment:

```bash
python -m venv venv
source venv/Scripts/activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Usage

Provide two image paths as arguments:

```bash
python compare.py path/to/image1.png path/to/image2.png
```

## How it works
This script uses the **Structural Similarity Index Measure (SSIM)** from `scikit-image` to evaluate the perceptual difference between two images, which is much more robust than checking exact pixel-by-pixel color values. The result is printed as a percentage.
