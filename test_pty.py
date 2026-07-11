import ptyprocess
import sys
p = ptyprocess.PtyProcessUnicode.spawn(["/bin/bash"])
print("Started bash")
try:
    print("Output:", p.read(1024))
except Exception as e:
    print("Error:", e)
