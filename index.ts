import textract from 'textract';

//const filePath = './doctest.docx';

const processDocx = (filePath: string): void => {
  textract.fromFileWithPath(filePath, (error: Error, text: string) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(text);
  });
};

// Replace 'path/to/your/docx/file.docx' with the actual file path
processDocx('./doctest.docx');