import select
import socket
import sys

def forward(source_socket, target_host, target_port):
    target_socket = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    try:
        target_socket.connect((target_host, target_port))
    except Exception as e:
        print(f"Failed to connect to target: {e}")
        source_socket.close()
        return

    sockets = [source_socket, target_socket]
    print(f"Connection established to {target_host}:{target_port}")
    try:
        while True:
            readable, _, _ = select.select(sockets, [], [])
            for s in readable:
                data = s.recv(4096)
                if not data:
                    return
                if s is source_socket:
                    target_socket.sendall(data)
                else:
                    source_socket.sendall(data)
    except Exception as e:
        print(f"Proxy error: {e}")
    finally:
        source_socket.close()
        target_socket.close()

def main():
    listen_port = 25432
    target_host = "db.yszndfmdkmskedofsemy.supabase.co"
    target_port = 5432

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("0.0.0.0", listen_port))
    server.listen(5)
    print(f"Listening on 0.0.0.0:{listen_port} -> {target_host}:{target_port}")

    while True:
        client_sock, addr = server.accept()
        print(f"Accepted connection from {addr}")
        import threading
        t = threading.Thread(target=forward, args=(client_sock, target_host, target_port))
        t.daemon = True
        t.start()

if __name__ == "__main__":
    main()
