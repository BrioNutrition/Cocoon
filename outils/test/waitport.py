import re,socket,sys,time
# attend que le port du serveur de test soit libre (le serveur du test précédent peut mettre un instant à mourir)
m=re.search(r"http\.server','(\d+)'",open(sys.argv[1]).read()); port=int(m.group(1)) if m else 8765
for _ in range(60):
    s=socket.socket()
    if s.connect_ex(('127.0.0.1',port))!=0: break
    s.close(); time.sleep(0.25)
