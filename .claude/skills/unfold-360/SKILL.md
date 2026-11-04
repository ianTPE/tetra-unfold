---
name: unfold-360
description: Unfolds a 360° equirectangular photo into a seamless tetrahedral rectangle, for viewing or for feeding the whole sphere to an AI model. Use when the user wants to unfold, flatten or convert a 360 photo or panorama, or asks 展開 360 照片 or 全景圖.
---

# Unfold a 360° photo

Run this from the repository root:

```
python unfold360.py <equirect.jpg> <out_dir>
```

It needs `numpy` and `pillow`. If the import fails, tell the user and suggest `pip install numpy pillow`, in a virtual environment if they use one.

## The input

- The photo must be equirectangular, so its width must be twice its height. The script stops with an error if it is not 2:1. Tell the user it is probably not a full 360° photo; do not crop or stretch it to get past the check.
- A 2:1 image is not always a real 360° photo. If the result looks wrong, say so.
- A large photo can take a while and use a lot of memory. Every output is a fixed 2400 pixels wide, except `0_equirect.jpg`.

## Output files

| File | What it is |
|---|---|
| `A_plain.jpg` | Main result. Straight lines stay straight within a triangular face |
| `A_equal.jpg` | Area-corrected: every pixel covers the same solid angle |
| `B_plain.jpg`, `B_equal.jpg` | The same, turned 180° about the vertical axis, so B has its corners where A's are clearest |
| `A_plain_folds.jpg` | `A_plain.jpg` with the tetrahedron fold lines drawn on it |
| `A_tiled.jpg` | Tiled copies of A, to check that the edges join |
| `0_equirect.jpg` | The input resized to 2048 × 1024 |

## How to read the result

When the camera was level, the horizontal centre line is the horizon: everything above it is sky and everything below it is ground. Straight ahead is at the centre and straight behind is at the four corners.

If the camera was tilted, the horizon is not on the centre line. Say so rather than treating the top half as sky.

Corner distortion is unavoidable. To recognise objects everywhere on the sphere, use A and B together: every direction is at least 35.3° from a corner in one of them.

For drone attitude there is a separate demo, `python drone_attitude.py <out_dir> <photo.jpg> ...`. Its sky rule is deliberately simple, so do not present it as a full attitude estimator.
