# 🛡️ YLabs Cyber Security Curriculum & Evaluation Guide (Detailed)

This document serves as the master guide for the YLabs Advanced Cyber Security Learning Track. It details exactly what students will build and hack in each sprint, what specific concepts they will learn, and precisely how our proprietary grading engine evaluates their work.

---

## 🎯 Hybrid Grading Engine: The Inner Workings

To ensure students are not just learning theory but actually writing secure code and exploiting vulnerabilities, our engine employs a dual-channel grading system for every ticket:

### 1. Dynamic Exploit/Patch Execution (Sandboxed Validation)
The platform natively runs the student's security scripts or patched application code in an isolated Docker sandbox. It then runs a suite of automated attacks against their code (or checks if their exploit script successfully extracts the flag).
- **Algorithm**: We use automated testing frameworks (like Pytest and Selenium) combined with network analysis tools.
- **Goal**: This forces students to write functional exploits or robust patches. A failure to secure the endpoint or capture the flag reduces the Execution Score.

### 2. Static Analysis Score (AST & Regex Pattern Matching)
Functional patches aren't enough—students must use industry-standard security libraries and best practices. We use AST parsing on their raw source files to detect the presence of required cryptographic functions, sanitization routines, or proper headers.
- **Example**: If a ticket asks for password hashing, the grading engine scans the code specifically for `bcrypt.hashpw` or `argon2`. If they use `md5`, the Logic Score drops drastically.
- **Combined Output**: The Final Grade is a composite of `(Execution Score + Static Analysis Score) / 2`.

---

## 🏃‍♂️ Sprint 1: Web Vulnerabilities (OWASP Top 10)

**Goal**: Understand and patch the most critical web vulnerabilities, starting with SQL Injection and Cross-Site Scripting.

* **SEC-101 | SQL Injection (SQLi) Patch**
  * **Task**: Fix a vulnerable Python Flask login endpoint that concatenates raw user input into an SQL query.
  * **Learning**: Parameterized queries, prepared statements, and SQL injection prevention.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Never use Python's `+` operator or f-strings for SQL variables., Use the `?` or `%s` placeholders provided by your database driver (like `sqlite3` or `psycopg2`).
  * **Common Mistakes**: Using string formatting (`f"SELECT * FROM users WHERE username='{user}'"`) instead of parameter binding.
  * **Evaluation**: Static Analysis checks for string formatting in SQL queries and the use of the `execute(query, params)` tuple syntax.
  * **Solution**:
    **`app.py`**
    ```python
    import sqlite3
    from flask import Flask, request, jsonify

    app = Flask(__name__)

    @app.route('/login', methods=['POST'])
    def login():
        username = request.json.get('username')
        password = request.json.get('password')
        
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # SECURE: Using parameterized queries instead of f-strings
        query = "SELECT * FROM users WHERE username = ? AND password = ?"
        cursor.execute(query, (username, password))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({"status": "success", "message": "Logged in!"})
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    ```

* **SEC-102 | Cross-Site Scripting (XSS) Sanitization**
  * **Task**: Implement a middleware or function to sanitize user-submitted blog comments before rendering them.
  * **Learning**: Stored XSS, HTML escaping, and Content Security Policy (CSP).
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 100 XP
  * **Hints**: Use the `bleach` library in Python or `DOMPurify` in JavaScript., Don't try to write your own regex to strip `<script>` tags—attackers will bypass it.
  * **Common Mistakes**: Only removing `<script>` tags (ignoring `onload` or `onerror` attributes in `<img>` tags).
  * **Evaluation**: Logic Grader checks for the import and usage of a recognized HTML sanitization library (e.g., `bleach.clean`).
  * **Solution**:
    **`comments.py`**
    ```python
    import bleach

    def sanitize_comment(raw_html):
        # Allow only safe tags (e.g., bold, italics)
        allowed_tags = ['b', 'i', 'strong', 'em']
        
        # Clean the input using bleach
        clean_html = bleach.clean(raw_html, tags=allowed_tags, strip=True)
        return clean_html

    # Example usage:
    # malicious_input = "<script>alert(1)</script><b>Hello</b>"
    # print(sanitize_comment(malicious_input)) # Outputs: <b>Hello</b>
    ```

* **SEC-103 | Cross-Site Request Forgery (CSRF) Tokens**
  * **Task**: Add CSRF token generation and validation to a state-changing POST endpoint.
  * **Learning**: Session management, CSRF tokens, and SameSite cookie attributes.
  * **Difficulty**: INTERMEDIATE
  * **Time Limit**: 60 minutes
  * **Yuvro Points**: 150 XP
  * **Hints**: A CSRF token should be cryptographically random and tied to the user's session., Ensure the token is passed in a hidden form field or a custom HTTP header (like `X-CSRF-Token`).
  * **Common Mistakes**: Using predictable tokens (like MD5 of the username) or forgetting to validate the token on the server side.
  * **Evaluation**: Grader inspects the session object for token storage and validates that POST requests missing the token return a 403 Forbidden.
  * **Solution**:
    **`csrf.py`**
    ```python
    import os
    import binascii
    from flask import session, abort, request

    def generate_csrf_token():
        if 'csrf_token' not in session:
            # Generate a cryptographically secure random token
            session['csrf_token'] = binascii.hexlify(os.urandom(32)).decode('utf-8')
        return session['csrf_token']

    def validate_csrf_token():
        # Require CSRF token for state-changing methods
        if request.method in ['POST', 'PUT', 'DELETE']:
            token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
            if not token or token != session.get('csrf_token'):
                abort(403, description="CSRF token missing or invalid")
    ```

---

## 🏃‍♂️ Sprint 2: Applied Cryptography & Authentication

**Goal**: Implement secure authentication mechanisms, password hashing, and token verification.

* **SEC-201 | Secure Password Hashing (Bcrypt)**
  * **Task**: Upgrade a legacy application that stores passwords in plaintext to use `bcrypt` hashing with a secure work factor.
  * **Learning**: Salting, key stretching, bcrypt, and timing attacks.
  * **Difficulty**: INTERMEDIATE
  * **Time Limit**: 60 minutes
  * **Yuvro Points**: 150 XP
  * **Hints**: Bcrypt automatically handles salt generation., Remember to encode your strings to bytes before hashing them.
  * **Common Mistakes**: Storing the salt separately in another database column (bcrypt includes the salt in the output hash string)., Using MD5 or SHA256 without a salt.
  * **Evaluation**: Logic Grader checks for `bcrypt.hashpw` and `bcrypt.checkpw`.
  * **Solution**:
    **`auth.py`**
    ```python
    import bcrypt

    def hash_password(plain_text_password):
        # Convert password to bytes
        password_bytes = plain_text_password.encode('utf-8')
        
        # Generate salt and hash (work factor / rounds is 12 by default)
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        return hashed.decode('utf-8') # Store this string in the DB

    def verify_password(plain_text_password, hashed_password):
        # Check if the provided password matches the stored hash
        password_bytes = plain_text_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(password_bytes, hash_bytes)
    ```

* **SEC-202 | JWT Verification & Signature Checking**
  * **Task**: Write a middleware function to parse a JSON Web Token (JWT) from the `Authorization` header and verify its signature using an HS256 secret key.
  * **Learning**: JWT structure (Header, Payload, Signature), HMAC, and expiration validation.
  * **Difficulty**: INTERMEDIATE
  * **Time Limit**: 60 minutes
  * **Yuvro Points**: 180 XP
  * **Hints**: Use the `PyJWT` library., Ensure you explicitly pass the `algorithms=["HS256"]` parameter to prevent algorithm confusion attacks.
  * **Common Mistakes**: Trusting the payload data without verifying the signature., Forgetting to check the `exp` (expiration) claim.
  * **Evaluation**: Sandbox execution sends expired tokens and tokens signed with invalid keys to ensure the middleware rejects them with a 401.
  * **Solution**:
    **`jwt_middleware.py`**
    ```python
    import jwt
    from functools import wraps
    from flask import request, jsonify

    SECRET_KEY = "super-secret-key-change-in-production"

    def require_jwt(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({"error": "Missing or invalid token"}), 401
                
            token = auth_header.split(' ')[1]
            
            try:
                # Decode and verify signature, algorithm, and expiration
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                # Attach the user payload to the request context
                request.user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token signature"}), 401
                
            return f(*args, **kwargs)
        return decorated
    ```

---

## 🏃‍♂️ Sprint 3: Network Security & Python Tooling

**Goal**: Write custom security scripts to automate network reconnaissance and traffic analysis.

* **SEC-301 | Basic Port Scanner**
  * **Task**: Write a Python script using the `socket` library to scan a target IP address for open TCP ports (e.g., 21, 22, 80, 443).
  * **Learning**: TCP Handshake, Sockets, and network timeouts.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Yuvro Points**: 120 XP
  * **Hints**: Use `socket.socket(socket.AF_INET, socket.SOCK_STREAM)`., Set a very short timeout (e.g., 0.5 seconds) so your script doesn't hang indefinitely on filtered ports.
  * **Common Mistakes**: Forgetting to close the socket connection after each attempt.
  * **Evaluation**: Sandbox runs the script against a mock server with specific open ports and verifies the console output matches the open ports.
  * **Solution**:
    **`scanner.py`**
    ```python
    import socket

    def scan_ports(target_ip, ports_to_scan):
        open_ports = []
        
        for port in ports_to_scan:
            # Create a new socket for each port attempt
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5) # Fast timeout
            
            # connect_ex returns 0 if successful
            result = s.connect_ex((target_ip, port))
            
            if result == 0:
                print(f"[+] Port {port} is OPEN")
                open_ports.append(port)
            
            s.close()
            
        return open_ports

    # Example: scan_ports('127.0.0.1', [21, 22, 80, 443, 8080])
    ```
