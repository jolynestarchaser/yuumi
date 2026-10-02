param([Parameter(Mandatory=$true)][string]$Path)
# Read-only alpha inspection. Never modifies or flattens the source image.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies @('System.Drawing.Common', 'System.Drawing.Primitives', 'System.Private.Windows.GdiPlus', 'System.Private.Windows.Core', 'System.Collections') -TypeDefinition @'
using System;
using System.Drawing;
using System.Collections.Generic;
public static class LayeredAtlasInspector {
  public static List<int[]> Inspect(string path) {
    using (var bitmap = new Bitmap(path)) {
      int width = bitmap.Width, height = bitmap.Height;
      var pixels = new bool[width * height];
      for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++) pixels[y * width + x] = bitmap.GetPixel(x, y).A > 64;
      var components = new List<int[]>();
      var queue = new int[pixels.Length];
      for (int i = 0; i < pixels.Length; i++) {
        if (!pixels[i]) continue;
        int start = 0, end = 1, left = width, top = height, right = 0, bottom = 0;
        queue[0] = i; pixels[i] = false;
        while (start < end) {
          int p = queue[start++], x = p % width, y = p / width;
          left = Math.Min(left, x); top = Math.Min(top, y);
          right = Math.Max(right, x); bottom = Math.Max(bottom, y);
          for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
            int nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            int n = ny * width + nx;
            if (pixels[n]) { pixels[n] = false; queue[end++] = n; }
          }
        }
        if (end > 20) components.Add(new[] { left, top, right - left + 1, bottom - top + 1, end });
      }
      components.Sort((a, b) => a[1].CompareTo(b[1]));
      return components;
    }
  }
}
'@
[LayeredAtlasInspector]::Inspect((Resolve-Path -LiteralPath $Path).Path) | ForEach-Object { $_ -join ',' }
