# Create a new Expo project

Run a single command.

 `npx create-expo-app@latest FoodOrdering -t`

For the template, let’s choose “Navigation (TypeScript)”.

Open up a terminal, and let’s run the development server with npm start

# Setup the folder structure
It’s recommended to store all the source code of the applications in a separate folder called `src`in the root folder.

- app → src/app
- components → src/components
- constants → src/constants

Open the files e.g `src/app/_layout.tsx` and update the path of the relative import to reflect the new location:

From `require('../assets/fonts/SpaceMono-Regular.ttf')` 
to 
`require('../../assets/fonts/SpaceMono-Regular.ttf')`.

Commit your changes:

1. Check the status of changed files:

`git status`

2. Add all the changed files to the staging area

`git add .`

3. Commit all changes from the staging area

`git commit -m "init expo project"`

4. To save the current uncommited changes and reset to the previous working commit.

`git stash push -m "work in progress"`

Temporarily save uncommitted code	`git stash`
Delete last commit	`git reset --hard HEAD~1`
Revert pushed submission	`git reset --hard <hash> && git push --force`
Undo commit safely	`git revert HEAD`

