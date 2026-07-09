git checkout -b feature/test
git commit -m "feat: add feature on branch"
git switch main
git branch -d feature/test
git checkout -b feature/new-feature
git push origin feature/new-feature
git rebase main
git push --force origin feature/new-feature
git merge branch-a
git commit -m "Resolved merge conflict"
git config merge.tool vimdiff
git mergetool
git commit -m "Resolved with merge tool"
git push origin feature-branch
git branch -d feature-branch
git commit -m "feat: add login button"
git commit -m "fix: resolve null pointer error"
git commit -m "docs: update readme with setup steps"
git commit -m "chore: bump version to 1.0.0"
git commit -m "refactor: extract service layer logic"
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
git cherry-pick abc123
git reset HEAD~1 --soft
git revert HEAD
git restore .
git push origin main
