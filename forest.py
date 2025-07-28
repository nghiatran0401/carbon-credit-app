import cv2
import numpy as np
from scipy import interpolate
import json
import os
import argparse

def conservative_forest_detection(img, mask_inside, debug_info=None):
    """
    Enhanced forest detection using multiple reliable methods.
    
    Args:
        img: Input BGR image
        mask_inside: Binary mask defining the area inside the forest border
        debug_info: Dictionary to store debug information
    
    Returns:
        Forest mask with enhanced detection
    """
    print("🌲 Enhanced forest detection...")
    
    # Initialize debug info if not provided
    if debug_info is None:
        debug_info = {}
    
    # Convert to color spaces
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    hls = cv2.cvtColor(img, cv2.COLOR_BGR2HLS)
    
    # Split channels
    h, s, v = cv2.split(hsv)
    l, a, b = cv2.split(lab)
    h_hls, l_hls, s_hls = cv2.split(hls)
    bgr_b, bgr_g, bgr_r = cv2.split(img)
    
    # Initialize list to store forest masks with names
    forest_methods = []
    
    print("   🎯 Method 1: Enhanced HSV green detection...")
    # More inclusive green detection
    lower_green = np.array([25, 30, 30])   # Broader range
    upper_green = np.array([95, 255, 255])
    mask_hsv_green = cv2.inRange(hsv, lower_green, upper_green)
    forest_methods.append(("HSV Enhanced", mask_hsv_green))
    
    print("   🎯 Method 2: Green channel dominance...")
    # Green stronger than red and blue (relaxed)
    green_stronger_than_red = bgr_g > (bgr_r * 1.1)  # Only 10% stronger
    green_stronger_than_blue = bgr_g > (bgr_b * 1.1)
    green_sufficient = bgr_g > 40  # Lower minimum green intensity
    mask_green_dominant = (green_stronger_than_red & green_stronger_than_blue & green_sufficient).astype(np.uint8) * 255
    forest_methods.append(("Green Dominance", mask_green_dominant))
    
    print("   🎯 Method 3: LAB negative 'a' channel...")
    # More inclusive LAB green detection
    mask_lab_green = cv2.inRange(a, 0, 125)  # Slightly broader range
    forest_methods.append(("LAB Green", mask_lab_green))
    
    print("   🎯 Method 4: Enhanced NDVI...")
    # More inclusive NDVI calculation
    numerator = bgr_g.astype(np.float32) - bgr_r.astype(np.float32)
    denominator = bgr_g.astype(np.float32) + bgr_r.astype(np.float32) + 1
    ndvi = numerator / denominator
    mask_ndvi = (ndvi > 0.1).astype(np.uint8) * 255  # Lower threshold
    forest_methods.append(("NDVI Enhanced", mask_ndvi))
    
    print("   🎯 Method 5: Green excess index...")
    # More inclusive green excess
    green_excess = bgr_g.astype(np.float32) - 0.5 * (bgr_r.astype(np.float32) + bgr_b.astype(np.float32))
    mask_green_excess = (green_excess > 15).astype(np.uint8) * 255  # Lower threshold
    forest_methods.append(("Green Excess", mask_green_excess))
    
    print("   🎯 Method 6: HLS-based vegetation...")
    # Use HLS for different vegetation types
    # Forest areas often have moderate lightness and saturation
    mask_hls_veg = ((l_hls > 30) & (l_hls < 180) & (s_hls > 20) & (h_hls >= 30) & (h_hls <= 90)).astype(np.uint8) * 255
    forest_methods.append(("HLS Vegetation", mask_hls_veg))
    
    print("   🎯 Method 7: Texture-based detection...")
    # Use texture to detect forest patterns
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Calculate local standard deviation (texture measure)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mean = cv2.morphologyEx(gray.astype(np.float32), cv2.MORPH_OPEN, kernel)
    sqr_diff = (gray.astype(np.float32) - mean) ** 2
    std_dev = cv2.morphologyEx(sqr_diff, cv2.MORPH_OPEN, kernel) ** 0.5
    # Forest areas typically have moderate texture
    mask_texture = ((std_dev > 8) & (std_dev < 40)).astype(np.uint8) * 255
    forest_methods.append(("Texture", mask_texture))
    
    print("   🎯 Method 8: Dark green areas...")
    # Detect darker green areas that might be missed
    mask_dark_green = ((bgr_g > bgr_r + 10) & (bgr_g > bgr_b + 10) & (bgr_g > 30)).astype(np.uint8) * 255
    forest_methods.append(("Dark Green", mask_dark_green))
    
    print(f"   ✅ Using {len(forest_methods)} enhanced detection methods")
    
    # Apply each method within the border area and calculate individual coverage
    print("   📊 Evaluating method performance...")
    method_coverage = []
    
    for name, mask in forest_methods:
        # Apply inside border mask
        mask_inside_area = cv2.bitwise_and(mask, mask, mask=mask_inside)
        coverage = np.sum(mask_inside_area > 0) / np.sum(mask_inside > 0) * 100
        method_coverage.append((name, mask_inside_area, coverage))
        print(f"     {name}: {coverage:.1f}% coverage")
    
    # Use more inclusive combination methods
    print("   🔗 Combining methods with enhanced inclusivity...")
    
    # Method 1: Weighted voting (give more weight to reliable methods)
    vote_sum = np.zeros_like(mask_inside, dtype=np.float32)
    weights = {
        "HSV Enhanced": 1.5,
        "Green Dominance": 1.2,
        "LAB Green": 1.3,
        "NDVI Enhanced": 1.4,
        "Green Excess": 1.0,
        "HLS Vegetation": 1.1,
        "Texture": 0.8,
        "Dark Green": 1.0
    }
    
    total_weight = 0
    for name, mask, coverage in method_coverage:
        if coverage > 3 and coverage < 90:  # Use most methods
            weight = weights.get(name, 1.0)
            vote_sum += (mask.astype(np.float32) / 255.0) * weight
            total_weight += weight
    
    if total_weight > 0:
        threshold = total_weight * 0.4  # 40% of total weight needed
        weighted_mask = (vote_sum >= threshold).astype(np.uint8) * 255
    else:
        weighted_mask = np.zeros_like(mask_inside)
    
    weighted_coverage = np.sum(weighted_mask > 0) / np.sum(mask_inside > 0) * 100
    print(f"     Weighted voting: {weighted_coverage:.1f}% coverage")
    
    # Method 2: Union of top performing methods
    union_mask = np.zeros_like(mask_inside, dtype=np.uint8)
    # Sort methods by coverage and take top performers
    sorted_methods = sorted(method_coverage, key=lambda x: x[2], reverse=True)
    for name, mask, coverage in sorted_methods[:5]:  # Take top 5 methods
        if coverage > 10:  # Only use methods with reasonable coverage
            union_mask = cv2.bitwise_or(union_mask, mask)
    
    union_coverage = np.sum(union_mask > 0) / np.sum(mask_inside > 0) * 100
    print(f"     Top methods union: {union_coverage:.1f}% coverage")
    
    # Method 3: Majority voting with lower threshold
    vote_count = np.zeros_like(mask_inside, dtype=np.float32)
    valid_methods = 0
    
    for name, mask, coverage in method_coverage:
        if coverage > 5 and coverage < 85:  # More inclusive range
            vote_count += mask.astype(np.float32) / 255.0
            valid_methods += 1
    
    if valid_methods >= 3:
        threshold = max(2, valid_methods * 0.35)  # Lower threshold (35%)
        majority_mask = (vote_count >= threshold).astype(np.uint8) * 255
    else:
        majority_mask = weighted_mask
    
    majority_coverage = np.sum(majority_mask > 0) / np.sum(mask_inside > 0) * 100
    print(f"     Enhanced majority: {majority_coverage:.1f}% coverage")
    
    # Choose the best method with preference for higher coverage
    candidates = [
        ("Weighted", weighted_mask, weighted_coverage),
        ("Union Top", union_mask, union_coverage),
        ("Majority Enhanced", majority_mask, majority_coverage)
    ]
    
    # Select method with highest reasonable coverage
    best_method = max(candidates, key=lambda x: x[2] if x[2] <= 80 else x[2] * 0.5)  # Penalize very high coverage
    
    selected_name, selected_mask, selected_coverage = best_method
    print(f"   🎯 Selected method: {selected_name} with {selected_coverage:.1f}% coverage")
    
    # Post-processing to clean up the selected mask
    print("   🔧 Post-processing...")
    
    # Remove small noise
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned_mask = cv2.morphologyEx(selected_mask, cv2.MORPH_OPEN, kernel_small)
    
    # Fill small gaps
    kernel_medium = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel_medium)
    
    # Light median filter
    final_mask = cv2.medianBlur(cleaned_mask, 3)
    
    final_coverage = np.sum(final_mask > 0) / np.sum(mask_inside > 0) * 100
    
    # Store debug information
    debug_info['forest_methods'] = {}
    for i, (name, mask, coverage) in enumerate(method_coverage):
        debug_info['forest_methods'][f'{i+1}_{name.lower().replace(" ", "_")}'] = mask
    
    debug_info['forest_methods']['weighted'] = weighted_mask
    debug_info['forest_methods']['union_top'] = union_mask
    debug_info['forest_methods']['majority_enhanced'] = majority_mask
    debug_info['forest_methods']['selected'] = selected_mask
    debug_info['forest_methods']['final'] = final_mask
    
    print(f"   ✅ Enhanced forest detection complete. Final coverage: {final_coverage:.1f}%")
    
    return final_mask

def detect_forest_border(image_path):
    """
    Detect the forest border in a satellite image using color detection and edge analysis.
    
    Args:
        image_path (str): Path to the satellite image

    Returns:
        tuple: (contour, border_points) - OpenCV contour and list of coordinate points
    """

    # Load the satellite image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"{image_path} not found")

    print(f"📸 Loaded image: {img.shape[1]}x{img.shape[0]} pixels")

    # Convert to different color spaces for comprehensive analysis
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    hls = cv2.cvtColor(img, cv2.COLOR_BGR2HLS)

    # --- Step 1: Multi-range color detection for red/orange borders ---
    print("🎨 Detecting border colors...")

    masks = []

    # Range 1: Bright red (low hue values)
    lower_bright_red = np.array([0, 100, 100])
    upper_bright_red = np.array([10, 255, 255])
    mask_hsv_red1 = cv2.inRange(hsv, lower_bright_red, upper_bright_red)
    masks.append(mask_hsv_red1)

    # Range 2: Bright red (high hue values - wrapping around)
    lower_bright_red2 = np.array([170, 100, 100])
    upper_bright_red2 = np.array([180, 255, 255])
    mask_hsv_red2 = cv2.inRange(hsv, lower_bright_red2, upper_bright_red2)
    masks.append(mask_hsv_red2)

    # Range 3: Orange-red tones
    lower_orange_red = np.array([5, 80, 80])
    upper_orange_red = np.array([20, 255, 255])
    mask_hsv_orange = cv2.inRange(hsv, lower_orange_red, upper_orange_red)
    masks.append(mask_hsv_orange)

    # Range 4: Dark red/brown tones (lower saturation and value)
    lower_dark_red = np.array([0, 50, 50])
    upper_dark_red = np.array([25, 200, 200])
    mask_hsv_dark_red = cv2.inRange(hsv, lower_dark_red, upper_dark_red)
    masks.append(mask_hsv_dark_red)

    # Range 4b: RGB-based red detection (high R, low G & B) to catch pure red lines
    b_channel, g_channel, r_channel = cv2.split(img)
    mask_rgb_red = cv2.inRange(r_channel, 150, 255) & cv2.inRange(g_channel, 0, 100) & cv2.inRange(b_channel, 0, 100)
    masks.append(mask_rgb_red)

    # Range 5: Using LAB color space for red detection
    # In LAB, positive 'a' channel values indicate red/magenta
    l_lab, a_lab, b_lab = cv2.split(lab)
    mask_lab_red = cv2.inRange(a_lab, 140, 255)
    masks.append(mask_lab_red)

    # --- White line detection ---
    # a) HSV (existing)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])
    mask_white_hsv = cv2.inRange(hsv, lower_white, upper_white)

    # b) HLS: high lightness, low saturation
    h_hls, l_hls, s_hls = cv2.split(hls)
    mask_white_hls = (l_hls > 200) & (s_hls < 40)
    mask_white_hls = mask_white_hls.astype(np.uint8) * 255

    # c) Gray intensity
    gray_for_white = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask_white_gray = cv2.inRange(gray_for_white, 220, 255)

    mask_white_combined = mask_white_hsv | mask_white_hls | mask_white_gray
    masks.append(mask_white_combined)

    # Combine all color masks (red + white) into a single mask of candidate border pixels
    mask_color_candidates = masks[0]
    for mask in masks[1:]:
        mask_color_candidates |= mask

    print(f"✅ Combined {len(masks)} red/white masks into color candidate mask")

    # ------------------------------------------------------------------
    # STEP 2: Remove small blobs likely corresponding to text or noise
    # ------------------------------------------------------------------
    print("🧽 Cleaning small blobs (likely text) from border mask...")

    cleaned_candidates = np.zeros_like(mask_color_candidates)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_color_candidates, connectivity=8)
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        # Heuristic: border dashes/dots usually have larger area OR are elongated; text is small & compact
        if area > 150 or max(w, h) > 20:
            cleaned_candidates[labels == i] = 255

    # ------------------------------------------------------------------
    # STEP 3: Connect nearby border segments by dilation and closing
    # ------------------------------------------------------------------
    kernel_ellipse = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    border_connected = cv2.morphologyEx(cleaned_candidates, cv2.MORPH_CLOSE, kernel_ellipse, iterations=2)

    # Thin the border slightly to remove excess thickness
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    border_connected = cv2.morphologyEx(border_connected, cv2.MORPH_OPEN, kernel_small, iterations=1)

    # ------------------------------------------------------------------
    # (Optional) Use edges to reinforce connections
    # ------------------------------------------------------------------
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 30, 100)
    border_connected |= (edges & border_connected)

    # Save intermediate for debugging if needed
    border_final = border_connected

    # --- Step 4: border cleanup finished ---
    print("🧹 Border mask connected and cleaned")

    # --- Step 5: Find the main contour with improved robustness ---
    print("🔍 Finding main contour with improved robustness...")
    contours, _ = cv2.findContours(border_connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    img_area = img.shape[0] * img.shape[1]

    if not contours:
        print("⚠️  No contours found with strict detection, trying fallback approach...")
        contours = []

    # ------------------------------------------------------------------
    # Choose the most plausible contour:
    # 1. Prefer contours whose area is between 3 % and 70 % of the image.
    # 2. Among those, pick the one with the largest area.
    # 3. If none found, fall back to the absolute largest contour (if any).
    # 4. If still none, create a rectangular fallback.
    # ------------------------------------------------------------------
    plausible_contours = [c for c in contours if 0.03 * img_area <= cv2.contourArea(c) <= 0.70 * img_area]

    if plausible_contours:
        largest_contour = max(plausible_contours, key=cv2.contourArea)
    elif contours:
        largest_contour = max(contours, key=cv2.contourArea)
        print("⚠️  Using largest contour outside plausible range – results may be less accurate")
    else:
        # Fallback: approximate the image border with a margin
        h, w = img.shape[:2]
        margin = int(0.05 * min(h, w))  # 5 % margin
        fallback_points = np.array([
            [margin, margin],
            [w - margin, margin],
            [w - margin, h - margin],
            [margin, h - margin]
        ])
        largest_contour = fallback_points.reshape(-1, 1, 2)

    print(f"📏 Selected contour area: {cv2.contourArea(largest_contour):.0f} pixels² (image area {img_area})")

    # --- Step 6: Create smooth, continuous border with gap bridging ---
    print("🎯 Creating smooth continuous border...")

    # Use convex hull to bridge small gaps but avoid excessive expansion.
    hull = cv2.convexHull(largest_contour)

    contour_area = cv2.contourArea(largest_contour)
    hull_area = cv2.contourArea(hull)

    # Decide whether to use hull based on relative size (no more than 20 % larger)
    if hull_area <= contour_area * 1.2:
        working_contour = hull
        print("   🔗 Using convex hull (small expansion)")
    else:
        working_contour = largest_contour

    # Approximate the contour with high precision
    perimeter = cv2.arcLength(working_contour, True)
    epsilon = 0.001 * perimeter  # Slightly larger epsilon for smoother approximation
    approx_contour = cv2.approxPolyDP(working_contour, epsilon, True)

    # Extract points and ensure closure
    points = approx_contour.reshape(-1, 2)
    if not np.array_equal(points[0], points[-1]):
        points = np.vstack([points, points[0]])

    # --- Step 7: Interpolate for smooth continuous border ---
    # Create parameter t for spline fitting
    t = np.linspace(0, 1, len(points))

    # Fit periodic spline (closed curve)
    tck, u = interpolate.splprep([points[:, 0], points[:, 1]], s=0, per=True)

    # Generate more points for smoother border
    num_interpolated_points = len(points) * 5
    u_new = np.linspace(0, 1, num_interpolated_points)
    smooth_points = interpolate.splev(u_new, tck)
    smooth_contour = np.array(smooth_points).T.astype(np.int32)

    # Reshape for OpenCV compatibility
    smooth_contour_cv = smooth_contour.reshape(-1, 1, 2)

    print(f"📊 Interpolated {len(points)} points to {len(smooth_contour)} points")

    # --- Step 8: Create ROBUST inside mask ---
    print("🎨 Creating robust inside mask...")

    # Main output image
    output = np.full(img.shape, (230, 224, 198), dtype=np.uint8)  # Beige background

    # Create mask for area inside the border with additional robustness
    mask_inside = np.zeros(img.shape[:2], dtype=np.uint8)
    cv2.drawContours(mask_inside, [smooth_contour_cv], -1, 255, thickness=cv2.FILLED)
    
    # Ensure the mask covers the entire intended area by using morphological operations
    kernel_expand = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (10, 10))
    mask_inside = cv2.morphologyEx(mask_inside, cv2.MORPH_CLOSE, kernel_expand, iterations=1)
    
    # Additional check: if the mask doesn't cover enough of the image, expand it
    mask_coverage = np.sum(mask_inside > 0) / (img.shape[0] * img.shape[1])
    print(f"   📊 Inside mask covers {mask_coverage:.1%} of image")
    
    if mask_coverage < 0.6:  # If less than 60% coverage, the mask might be too restrictive
        print("   ⚠️  Mask coverage seems low, expanding...")
        kernel_expand_more = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))
        mask_inside = cv2.dilate(mask_inside, kernel_expand_more, iterations=2)
        mask_coverage_new = np.sum(mask_inside > 0) / (img.shape[0] * img.shape[1])
        print(f"   ✅ Expanded mask now covers {mask_coverage_new:.1%} of image")

    # --- CONSERVATIVE FOREST DETECTION ---
    debug_info = {}
    mask_forest_final = conservative_forest_detection(img, mask_inside, debug_info)

    # --- CALCULATE FOREST SURFACE AREA ---
    surface_area_data = calculate_forest_surface_area(mask_forest_final, mask_inside, img.shape)

    # Apply colors to output image
    output[mask_forest_final > 0] = (58, 145, 58)  # BGR for forest green (#3a913a)

    # Draw the continuous red border with consistent color and thickness
    border_color = (0, 0, 255)  # Pure red in BGR
    border_thickness = 4  # Slightly thicker for better visibility
    cv2.drawContours(output, [smooth_contour_cv], -1, border_color, thickness=border_thickness)
    
    # Also draw individual border points to ensure complete coverage
    for point in smooth_contour:
        cv2.circle(output, tuple(point), 2, border_color, -1)

    # ------------------------------------------------------------------
    # Dynamic output filenames based on input image to avoid overwriting
    # ------------------------------------------------------------------
    base_name = os.path.splitext(os.path.basename(image_path))[0]

    out_map = f"{base_name}_map_final_conservative.png"
    out_border_mask = f"{base_name}_border_mask.png"
    out_debug = f"{base_name}_debug_conservative_methods.png"
    out_json = f"{base_name}_border_coordinates_conservative.json"
    out_txt = f"{base_name}_border_coordinates_conservative.txt"
    out_csv = f"{base_name}_border_coordinates_conservative.csv"

    # Save main output
    cv2.imwrite(out_map, output)

    # Save enhanced border mask for debugging
    cv2.imwrite(out_border_mask, border_connected)

    # --- Step 9: Create debug image showing detection methods ---
    debug_size = (img.shape[0] * 3, img.shape[1] * 3, 3)
    debug_img = np.zeros(debug_size, dtype=np.uint8)

    # Get method names
    method_names = list(debug_info['forest_methods'].keys())[:9]  # Show first 9 methods
    
    # 3x3 grid positions
    positions = [
        (0, 0), (0, 1), (0, 2),  # Row 1
        (1, 0), (1, 1), (1, 2),  # Row 2  
        (2, 0), (2, 1), (2, 2)   # Row 3
    ]
    
    # First slot: original image
    debug_img[0:img.shape[0], 0:img.shape[1]] = img
    
    # Show detection methods
    for i, method_name in enumerate(method_names):
        if i + 1 < len(positions):  # Skip first position (original image)
            row, col = positions[i + 1]
            y_start = row * img.shape[0]
            y_end = (row + 1) * img.shape[0]
            x_start = col * img.shape[1]
            x_end = (col + 1) * img.shape[1]
            
            mask = debug_info['forest_methods'][method_name]
            debug_img[y_start:y_end, x_start:x_end] = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    
    # Last slot: final result
    if len(positions) > len(method_names):
        row, col = positions[-1]
        y_start = row * img.shape[0]
        y_end = (row + 1) * img.shape[0]
        x_start = col * img.shape[1]
        x_end = (col + 1) * img.shape[1]
        debug_img[y_start:y_end, x_start:x_end] = output

    # Add text labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5
    font_color = (255, 255, 255)
    font_thickness = 1

    labels = ['Original'] + [name.replace('_', ' ').title()[:15] for name in method_names] + ['Final Result']
    
    for i, label in enumerate(labels[:9]):  # Max 9 labels
        if i < len(positions):
            row, col = positions[i]
            x_pos = col * img.shape[1] + 10
            y_pos = row * img.shape[0] + 20
            cv2.putText(debug_img, label, (x_pos, y_pos), font, font_scale, font_color, font_thickness)

    cv2.imwrite(out_debug, debug_img)

    # --- Step 10: Save border coordinates in multiple formats ---
    print("💾 Saving border coordinates...")

    border_points = smooth_contour.tolist()

    # Calculate forest coverage
    forest_coverage = np.sum(mask_forest_final > 0) / np.sum(mask_inside > 0) * 100

    # JSON format with metadata
    coordinates_data = {
        "metadata": {
            "total_points": len(border_points),
            "original_points": len(points),
            "interpolation_factor": 5,
            "image_width": img.shape[1],
            "image_height": img.shape[0],
            "contour_area": float(cv2.contourArea(smooth_contour_cv)),
            "contour_perimeter": float(cv2.arcLength(smooth_contour_cv, True)),
            "forest_coverage_percent": float(forest_coverage),
            "detection_method": "conservative_forest_focused_enhanced_border",
            "zoom_18_5_surface_area": surface_area_data
        },
        "border_points": border_points
    }

    with open(out_json, 'w') as f:
        json.dump(coordinates_data, f, indent=2)

    # Human-readable text format
    with open(out_txt, 'w') as f:
        f.write("="*60 + "\n")
        f.write("CONSERVATIVE FOREST BORDER COORDINATES (ENHANCED)\n")
        f.write("="*60 + "\n\n")
        f.write(f"Image dimensions: {img.shape[1]} x {img.shape[0]} pixels\n")
        f.write(f"Total border points: {len(border_points)}\n")
        f.write(f"Original contour points: {len(points)}\n")
        f.write(f"Interpolation factor: 5x\n")
        f.write(f"Contour area: {cv2.contourArea(smooth_contour_cv):.2f} pixels²\n")
        f.write(f"Contour perimeter: {cv2.arcLength(smooth_contour_cv, True):.2f} pixels\n")
        f.write(f"Forest coverage: {forest_coverage:.1f}%\n")
        f.write(f"Detection method: Conservative forest-focused with enhanced border\n")
        
        # Add surface area analysis
        f.write("\n" + "="*60 + "\n")
        f.write("GOOGLE MAPS ZOOM 18.5 FOREST SURFACE AREA\n")
        f.write("="*60 + "\n\n")
        f.write(f"Forest area pixels: {surface_area_data['forest_area_pixels']:,}\n")
        f.write(f"Total image pixels: {surface_area_data['total_image_pixels']:,}\n")
        f.write(f"Forest coverage of image: {surface_area_data['forest_coverage_percent']:.1f}%\n")
        
        res_data = surface_area_data['zoom_18_5_resolution']
        f.write(f"\nGoogle Maps Zoom 18.5 (~1.4m/pixel) Forest Area:\n")
        f.write("-"*50 + "\n\n")
        f.write(f"• {res_data['forest_area_m2']:,.0f} m² ({res_data['forest_area_m2']/1000:.1f}K m²)\n")
        f.write(f"• {res_data['forest_area_hectares']:.1f} hectares\n")
        f.write(f"• {res_data['forest_area_km2']:.6f} km²\n")
        f.write(f"• {res_data['forest_area_acres']:.1f} acres\n")
        
        f.write("\n" + "-"*60 + "\n")
        f.write("Coordinates (x, y):\n")
        f.write("-"*60 + "\n\n")
        
        for i, (x, y) in enumerate(border_points):
            f.write(f"Point {i+1:4d}: ({x:4d}, {y:4d})\n")

    # CSV format for easy import
    with open(out_csv, 'w') as f:
        f.write("point_id,x,y\n")
        for i, (x, y) in enumerate(border_points):
            f.write(f"{i+1},{x},{y}\n")

    # --- Step 11: Print summary ---
    print("\n" + "="*60)
    print("✨ ENHANCED CONSERVATIVE FOREST DETECTION COMPLETE! ✨")
    print("="*60)
    print(f"📍 Total border points: {len(border_points)}")
    print(f"📐 Contour area: {cv2.contourArea(smooth_contour_cv):,.0f} pixels²")
    print(f"📏 Contour perimeter: {cv2.arcLength(smooth_contour_cv, True):,.0f} pixels")
    print(f"🌲 Forest coverage: {forest_coverage:.1f}%")
    print(f"🔬 Detection approach: Conservative with enhanced border connectivity")
    print(f"🎯 Inside mask coverage: {mask_coverage:.1%} of image")
    
    # Print surface area summary for Google Maps Zoom 18.5
    print(f"\n📐 GOOGLE MAPS ZOOM 18.5 FOREST SURFACE AREA:")
    print(f"🌲 Forest area pixels: {surface_area_data['forest_area_pixels']:,}")
    print(f"📊 Total image pixels: {surface_area_data['total_image_pixels']:,}")
    print(f"📈 Forest coverage of image: {surface_area_data['forest_coverage_percent']:.1f}%")
    
    # Show Google Maps Zoom 18.5 estimate
    res_data = surface_area_data['zoom_18_5_resolution']
    print(f"   Google Maps Zoom 18.5 (~1.4m/pixel): {res_data['forest_area_hectares']:.1f} hectares ({res_data['forest_area_acres']:.1f} acres)")
    
    print("\n📁 Enhanced output files created:")
    print("   ✅", out_map, "- Enhanced forest detection result")
    print("   ✅", out_debug, "- Detection methods visualization")
    print("   ✅", out_json, "- JSON with Google Maps Zoom 18.5 surface area")
    print("   ✅", out_txt, "- Text format with Google Maps Zoom 18.5 surface area")
    print("   ✅", out_csv, "- Enhanced CSV format")
    print("="*60)

    return smooth_contour_cv, border_points

def calculate_forest_surface_area(mask_forest, mask_inside, img_shape):
    """
    Calculate forest surface area for Google Maps Zoom 18.5 (~1.4m/pixel).
    
    Args:
        mask_forest: Binary mask of detected forest areas (not used in final calculation)
        mask_inside: Binary mask of the forest area (inside border)
        img_shape: Shape of the original image (height, width)
    
    Returns:
        Dictionary with surface area calculations
    """
    print("📐 Calculating forest surface area for Google Maps Zoom 18.5...")
    
    # The inside mask IS the forest area
    forest_area_pixels = np.sum(mask_inside > 0)
    total_image_pixels = img_shape[0] * img_shape[1]
    forest_coverage_percent = (forest_area_pixels / total_image_pixels) * 100
    
    print(f"   🌲 Forest area pixels: {forest_area_pixels:,}")
    print(f"   📊 Total image pixels: {total_image_pixels:,}")
    print(f"   📈 Forest coverage of image: {forest_coverage_percent:.1f}%")
    
    # Google Maps Zoom 18.5 resolution (~1.4m/pixel)
    meters_per_pixel = 1.4
    
    # Calculate area in square meters
    area_m2 = forest_area_pixels * (meters_per_pixel ** 2)
    
    # Convert to other units
    area_hectares = area_m2 / 10000  # 1 hectare = 10,000 m²
    area_km2 = area_m2 / 1000000     # 1 km² = 1,000,000 m²
    area_acres = area_m2 * 0.000247105  # 1 m² = 0.000247105 acres
    
    print(f"   📐 Google Maps Zoom 18.5 (~1.4m/pixel):")
    print(f"     • {area_m2:,.0f} m² ({area_m2/1000:.1f}K m²)")
    print(f"     • {area_hectares:.1f} hectares")
    print(f"     • {area_km2:.6f} km²")
    print(f"     • {area_acres:.1f} acres")
    
    return {
        "forest_area_pixels": int(forest_area_pixels),
        "total_image_pixels": int(total_image_pixels),
        "forest_coverage_percent": float(forest_coverage_percent),
        "zoom_18_5_resolution": {
            "meters_per_pixel": meters_per_pixel,
            "forest_area_m2": area_m2,
            "forest_area_hectares": area_hectares,
            "forest_area_km2": area_km2,
            "forest_area_acres": area_acres
        }
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Conservative forest detection on satellite images")
    parser.add_argument("images", nargs="+", help="Path(s) to input image files")

    args = parser.parse_args()

    for image_file in args.images:
        print(f"\nProcessing forest image with conservative detection: {image_file}")
        try:
            detect_forest_border(image_file)
            print("🎉 Processing complete! Check the output files for", image_file)
        except Exception as e:
            print(f"❌ Error processing {image_file}: {e}")