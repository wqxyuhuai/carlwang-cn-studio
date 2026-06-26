import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [".open-next/**"]
  },
  ...next
];

export default eslintConfig;
