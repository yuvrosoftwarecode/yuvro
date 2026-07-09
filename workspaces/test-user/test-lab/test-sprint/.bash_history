git config --global user.name "Test User"
git config --global user.email "test@test.com"
git init
git add README.md
git commit -m "Initialize repository with a readme file"
git stash
git commit -m "Fix something separate from stash"
git stash pop
git add -p
git commit -m "Partial staging commit"
git commit --amend -m "Amended commit message that is descriptive"
git log --oneline
git log --graph --all
git log --author="Test User"
git diff
git diff --staged
git bisect start
git bisect bad
git bisect good abc123
git remote add origin https://github.com/test/repo.git
git push -u origin main
git clone https://github.com/test/repo.git
git checkout -b feature/new-feature
git push origin feature/new-feature
ssh-keygen -t ed25519 -C "test@test.com"
ssh -T git@github.com
