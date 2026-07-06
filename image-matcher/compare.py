import cv2
import argparse
import sys
# pyrefly: ignore [missing-import]
from skimage.metrics import structural_similarity as ssim

def compare_images(imageA_path, imageB_path):
    # Load the two images
    imageA = cv2.imread(imageA_path)
    imageB = cv2.imread(imageB_path)
    
    if imageA is None:
        print(f"Error: Could not read image at {imageA_path}")
        return None
    if imageB is None:
        print(f"Error: Could not read image at {imageB_path}")
        return None

    # Convert the images to grayscale
    grayA = cv2.cvtColor(imageA, cv2.COLOR_BGR2GRAY)
    grayB = cv2.cvtColor(imageB, cv2.COLOR_BGR2GRAY)
    
    import numpy as np
    
    # Helper to crop out excess white background
    def crop_white_borders(img):
        mask = img < 250
        coords = cv2.findNonZero(mask.astype(np.uint8))
        if coords is None: return img
        x, y, w, h = cv2.boundingRect(coords)
        return img[y:y+h, x:x+w]
        
    # Crop both images to their actual content
    croppedA = crop_white_borders(grayA)
    croppedB = crop_white_borders(grayB)
    
    # Resize the cropped user image to exactly match the cropped target image's dimensions.
    # This prevents the white background from ruining the score, but ensures the UI components align.
    if croppedA.shape != croppedB.shape:
        croppedB = cv2.resize(croppedB, (croppedA.shape[1], croppedA.shape[0]))
    
    # Compute the Structural Similarity Index (SSIM) between the two cropped & resized images
    score, diff = ssim(croppedA, croppedB, full=True, data_range=255)
    
    # STRICTURE SCALING: Web UI screenshots often share massive white backgrounds.
    # By cropping them out, we get true structural similarity. We apply a penalty curve
    # so that completely different structures (like img13 & img14) drop to ~0%, 
    # while similar structures (like img7 & img8) retain a fair score.
    strict_score = max(0, (score - 0.60) / 0.40)
    
    # Convert the strict score to a percentage (0 to 100)
    match_percentage = strict_score * 100
    
    print(f"Raw SSIM: {score:.4f} | Strict Match Score: {match_percentage:.2f}%")
    return match_percentage

if __name__ == "__main__":
    import os
    parser = argparse.ArgumentParser(description="Compare images and calculate a visual similarity score.")
    parser.add_argument("image1", nargs="?", help="Path to the first image (e.g., target design)")
    parser.add_argument("image2", nargs="?", help="Path to the second image (e.g., user component)")
    parser.add_argument("--batch", action="store_true", help="Compare predefined pairs (1&2, 3&4, etc.)")
    parser.add_argument("--ext", default=".png", help="File extension for batch mode (default: .png)")
    
    args = parser.parse_args()
    
    if args.batch or (not args.image1 and not args.image2):
        pairs = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12), (13, 14)]
        print(f"Running batch comparison for pairs: {pairs}\n")
        
        for idx1, idx2 in pairs:
            img1 = f"img{idx1}{args.ext}"
            img2 = f"img{idx2}{args.ext}"
            
            print(f"--- Comparing {img1} and {img2} ---")
            if not os.path.exists(img1) or not os.path.exists(img2):
                print(f"Skipping: {img1} or {img2} not found.\n")
                continue
                
            compare_images(img1, img2)
            print("")
            
    elif args.image1 and args.image2:
        compare_images(args.image1, args.image2)
    else:
        parser.print_help()
