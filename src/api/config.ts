// ───────────────────────────────────────────────────────────────────────────
// Backend base URL.
//
// A PHYSICAL PHONE cannot reach your computer's "localhost". Use your computer's
// LAN IP and make sure the phone is on the SAME Wi-Fi, and Django is running on
// 0.0.0.0:8000  (python manage.py runserver 0.0.0.0:8000).
//
// Pre-filled with this machine's detected Wi-Fi IP — change it if your IP differs
// (run `ipconfig` on Windows / `ifconfig` on macOS to find it).
//   • Android emulator → http://10.0.2.2:8000/api/v1
//   • iOS simulator    → http://localhost:8000/api/v1
//   • Physical phone   → http://<your-LAN-IP>:8000/api/v1
// ───────────────────────────────────────────────────────────────────────────
export const API_BASE = "http://192.168.71.160:8000/api/v1";
