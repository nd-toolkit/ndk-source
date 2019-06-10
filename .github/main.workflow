workflow "Tests & Coverage" {
  on = "push"
  resolves = ["ESLint checks", "Tests & Coverage"]
}

action "Install dependencies" {
  uses = "nd-toolkit/github-actions/node-current@master"
  runs = "npm"
  args = "install"
}

action "ESLint checks" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "run eslint"
}

action "Tests & Coverage" {
  uses = "nd-toolkit/github-actions/node-current@master"
  needs = ["Install dependencies"]
  runs = "npm"
  args = "install"
}