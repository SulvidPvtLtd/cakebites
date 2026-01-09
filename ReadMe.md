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


# Predefined types

Create a file in the `src` file for `types.ts` and define types.

These types will make the components type-safe and mak sure who ever is using it will send a valid product object.

# Craete Typescript Path Aliases

With typescript path aliases, we can define path shortcuts to some folders that we often import from, and then our import statements will look much cleaner.

For that, we have to enable this experiment inside `app.json`

{
  "expo": {
    "experiments": {
      "tsconfigPaths": true
    }
  }
}

And define our path aliases inside tsconfig.json

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@assets/*": ["assets/*"]
    }
  }
}

Now, we can use this aliases when importing files and assets. 

`import products from '../../../assets/data/products';`

`import products from '@assets/data/products';`

# FlatLIST

A FlatList is a React Native component that helps us render Vertical and Horizontal Scrollable Lists of data. 
Usually, designed for infinite scrollable lists, such as the Instagram feed. 

We will use a FlatList to render the list of products on our home screen.

It’s quite easy to render a simple list, because it has only 2 required properties

<FlatList
  data={products}
  renderItem={({ item }) => <ProductListItem product={item} />}
/>

- data: an array of items. In our cases, it’s an array of products
- renderItem: a function that will render 1 item from the array.