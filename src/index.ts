import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const camelize = (string: string) =>
  string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "");

// read all the markdown files in the data folder
const mdFiles = fs.readdirSync(path.resolve(__dirname, "../data"));

// read the markdown file
mdFiles.forEach((file) => {
  const mdFile = fs.readFileSync(
    path.resolve(__dirname, `../data/${file}`),
    "utf8"
  );

  // load the markdown file
  const $ = cheerio.load(mdFile);

  // get category name
  const categoryName = camelize(file.split(".")[0]);

  // get all the <details> tags
  const details = $("details");

  // @ts-ignore
  let filters = [];
  // @ts-ignore
  let subCategoryFilters = [];

  // regex to remove emoji
  const searchValue =
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

  details.each((i, detail) => {
    // reset filters array
    filters = [];
    subCategoryFilters = [];

    const rows = $(detail).text().split("\n");
    // get subcategory name in <summary> tag
    const subcategoryName = $(detail).find("summary").text().trim();
    // format subcategory name
    const formattedSubcategoryName = camelize(
      subcategoryName
        // remove emoji
        .replace(searchValue, "")
        // remove multiple spaces
        .replace(/\s+/g, " ")
        // remove text in parentheses
        .replace(/\(.*\)/g, "")
        // remove "/"
        .replace(/\//g, " ")
        // remove commas
        .replace(/,/g, " ")
        // remove spaces at the beginning and end
        .trim()
    );

    subCategoryFilters.push({
      id: `${formattedSubcategoryName}_${i + 1}`,
      name: subcategoryName,
      options: `${formattedSubcategoryName}Filters`,
    });

    rows.forEach((row, j) => {
      if (row.includes("|") && !row.includes(":-:")) {
        const columns = row
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean);
        columns.forEach((column, k) => {
          // replace spaces with "_"
          const filterName = column.replace(/\s/g, "_");
          filters.push({
            id: `${column}_${i + 1}_${j + 1}_${k + 1}`,
            name: column,
            description: "",
            style: column,
            image: `/images/filters/${categoryName}/${formattedSubcategoryName}/${filterName}.png`,
            isSelected: false,
          });
        });
      }
    });

    const categoryDir = path.resolve(__dirname, `../output/${categoryName}`);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir);
    }

    const subCategoryDir = path.resolve(
      __dirname,
      `../output/${categoryName}/subCategories`
    );
    if (!fs.existsSync(subCategoryDir)) {
      fs.mkdirSync(subCategoryDir);
    }

    fs.writeFileSync(
      path.resolve(__dirname, `../output/${categoryName}/${categoryName}.ts`),
      `import { SubCategoryFilter } from "../typeFilters";

      import { ${formattedSubcategoryName}Filters } from "./subCategories/${formattedSubcategoryName}";

      export const ${categoryName}Filters: SubCategoryFilter[] = ${JSON.stringify(
        subCategoryFilters,
        null,
        2
      )};`
    );

    fs.writeFileSync(
      path.resolve(
        __dirname,
        `../output/${categoryName}/subCategories/${formattedSubcategoryName}.ts`
      ),
      `import { Filter } from "../../typeFilters";

      export const ${formattedSubcategoryName}Filters: Filter[] = ${JSON.stringify(
        // @ts-ignore
        filters,
        null,
        2
      )};`
    );
  });
});
