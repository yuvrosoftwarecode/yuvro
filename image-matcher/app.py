from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

app = Flask(__name__)
CORS(app)

def compare_images_from_memory(fileA, fileB):
    # Convert file objects to numpy arrays
    npimgA = np.frombuffer(fileA.read(), np.uint8)
    npimgB = np.frombuffer(fileB.read(), np.uint8)
    
    # Decode to cv2 images
    imageA = cv2.imdecode(npimgA, cv2.IMREAD_COLOR)
    imageB = cv2.imdecode(npimgB, cv2.IMREAD_COLOR)
    
    if imageA is None or imageB is None:
        return 0.0

    # Convert to grayscale
    grayA = cv2.cvtColor(imageA, cv2.COLOR_BGR2GRAY)
    grayB = cv2.cvtColor(imageB, cv2.COLOR_BGR2GRAY)
    
    # Resize imageB to match imageA's dimensions
    if grayA.shape != grayB.shape:
        grayB = cv2.resize(grayB, (grayA.shape[1], grayA.shape[0]))

    # Compute SSIM
    score, _ = ssim(grayA, grayB, full=True, data_range=255)
    
    # Very Forgiving Scaling: Instead of a harsh penalty, we just slightly curve the raw SSIM.
    # Web UIs share a lot of white background, so a completely wrong UI might have a raw SSIM of 0.80.
    # Using score ** 2 means a raw SSIM of 0.80 still yields a very generous 64% match!
    match_percentage = (score ** 2) * 100
    
    return match_percentage

@app.route("/api/compare", methods=["POST"])
def compare_endpoint():
    if 'image1' not in request.files or 'image2' not in request.files:
        return jsonify({"error": "Missing image files"}), 400
        
    img1 = request.files['image1']
    img2 = request.files['image2']
    
    try:
        score = compare_images_from_memory(img1, img2)
        return jsonify({"score": score})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Run on port 5000 by default
    app.run(port=5000, debug=True)
