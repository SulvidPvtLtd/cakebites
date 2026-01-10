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

# Create screens using Expo Router

Create a new page for the details screen.

`app/product.tsx` -> We ca link to this page when we press on a `ProductListItem`


Card
 ├─ Image
 └─ TextContainer
     ├─ Title
     ├─ Price
     └─ Go to details

When you press the Product with a Pressable event from the `ProductListItem`, 

const ProductListItem = ({ product }: ProductListItemProps) => {
  return (
    <Link href={'/product'} asChild>
      <Pressable style={styles.container}>
				....

how do you know which product we are directing ourselves to on the  `app/product.tsx`.

You can convert the file `product.tsx` into a dynamic file by renaming it to `app/[id].tsx`

When linking to it, send the product id as part of the link

<Link href={`/${product.id}`} asChild>

Read the path parameter inside the Product details screen using

const { id } = useLocalSearchParams();


# Nested Stack Navigator

We want the product details page to be displayed under the Menu tab. 
That means that the menu tab will consist of multiple screen: 
1. The list of products and 
2. product details. 

Let’s group them in a separate folder `app/(tabs)/menu`with 2 screens (`index.tsx` and `[id].tsx`) and a `_layout.tsx`.

The layout can simply export the `<Stack />` component, to use a Stack navigator for the child routes.

- `src/app/(tabs)/_layout.tsx`
import { Stack } from 'expo-router';

export default function MenuLayout() {
  return <Stack />;
};


- By doing that, our `(tabs)/index.tsx` should simply redirect to the menu page.

import { Redirect } from 'expo-router';

export default function TabIndex () {
  return <Redirect href={'/menu/'} />;
};


Now, configure the `(tabs)/_layout.tsx` and hide the index route, rename the other routes and change the icons.

How do you do that?
- In the `app//(tabs)/_layout.tsx`, 

// Disable the "index" tab by setting href to null
<Tabs.Screen name="index" options={{ href: null}}/>


When we click on a product item, we get directed to "This screen doesn't exist".

So we need to go to our compenent "ProductListItem" , when we navigate to our product, the new path is no longer:

 `<Link href={`/${product.id}`} asChild>` 
 
 but should now be pointing to the menu folder fisrt as 
 
 `<Link href={`/menu/${product.id}`} asChild>`


Hidding Two page Headers on the Menu page's stack navigator.

- Menu and Index.
One is coming from the `(tabs)/_layout.tsx` and the other coming form ``(tabs)/menu/_layout.tsx`. 

So we will hide the header of the same file path `(tabs)/_layout.tsx` where we set the redirect to null previously.

How do we do that?

- In the Stack navigation's Tabs.Screen, set its option to `headerShown: false`,

