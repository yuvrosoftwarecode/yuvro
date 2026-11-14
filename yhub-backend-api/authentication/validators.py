import re

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,37}[a-zA-Z0-9])?$")

def validate_username_format(username: str) -> tuple[bool, str]:
    """
    Validates username format according to GitHub-style rules:
    - 3 to 39 characters
    - Alphanumeric characters, single hyphens, underscores, or dots
    - Cannot begin or end with a hyphen, underscore, or dot
    - Cannot contain consecutive hyphens, underscores, or dots
    """
    if not username:
        return False, "Username is required."

    username = username.strip()

    if len(username) < 3:
        return False, "Username must be at least 3 characters."

    if len(username) > 39:
        return False, "Username must be 39 characters or fewer."

    if username[0] in "-_." or username[-1] in "-_.":
        return False, "Username cannot begin or end with a hyphen, underscore, or dot."

    if "--" in username or "__" in username or ".." in username:
        return False, "Username cannot contain consecutive hyphens, underscores, or dots."

    if not USERNAME_REGEX.match(username):
        return False, "Username can only contain alphanumeric characters, hyphens, underscores, and dots."

    return True, ""
