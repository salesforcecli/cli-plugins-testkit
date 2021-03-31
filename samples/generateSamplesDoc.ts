import * as path from 'path';
import * as os from 'os';
import { fs as fsCore } from '@salesforce/core';

// The structure of topic content in topics.json.
type SamplesContent = {
  header: string;
  usecase: string;
  file?: string;
  script?: string;
};

// Top level type in topics.json.  Represents a section within the doc.
type SamplesTopic = {
  name: string;
  title: string;
  type: 'typescript' | 'bash' | 'inline';
  description?: string;
  content: SamplesContent[] | string[];
};

const importsToReplace = new Map<string, string>();
importsToReplace.set('execCmd', `import { execCmd } from '../src/execCmd';${os.EOL}`);
importsToReplace.set('TestSession', `import { TestSession } from '../src/testSession';${os.EOL}`);
importsToReplace.set('TestProject', `import { TestProject } from '../src/testProject';${os.EOL}`);

// Replaces local imports for nut samples compilation with equivalent library import.
function replaceImports(nut: string): string {
  let imports: string[] = [];
  let replacedNut = nut;

  importsToReplace.forEach((val, key) => {
    if (nut.includes(key)) {
      replacedNut = replacedNut.replace(val, '');
      imports.push(key);
    }
  });
  if (imports.length) {
    const libImport = `import { ${imports.join(', ')} } from '@salesforce/cli-plugins-testkit';${os.EOL}`;
    replacedNut = `${libImport}${replacedNut}`;
  }
  return replacedNut;
}

// Reads topics.json for configuration and doc structure. Writes SAMPLES.md.
(function generateSamples() {
  const topics = fsCore.readJsonSync(path.join(__dirname, 'topics.json')) as SamplesTopic[];

  const fileModificationWarning = `<!--${os.EOL}WARNING: THIS IS A GENERATED FILE. DO NOT MODIFY DIRECTLY.  USE topics.json${os.EOL}-->${os.EOL}`;

  let tableOfContents: string[] = [fileModificationWarning];
  let sampleContents: string[] = [];

  for (let topic of topics) {
    tableOfContents.push(`### ${topic.name} ###${os.EOL}`);
    sampleContents.push(`${os.EOL}---${os.EOL}# ${topic.title}${os.EOL}${os.EOL}`);
    topic.description && sampleContents.push(`${topic.description}${os.EOL}${os.EOL}`);

    if (['typescript', 'bash'].includes(topic.type)) {
      for (let content of topic.content) {
        const samplesContent = content as SamplesContent;
        const header = samplesContent.header;
        const headerLink = header.replace(/\s+/g, '-').toLowerCase();
        tableOfContents.push(`* [${header}](#${headerLink})${os.EOL}`);

        sampleContents.push(`## ${header}${os.EOL}${os.EOL}`);
        sampleContents.push(`***Usecase: ${samplesContent.usecase}***${os.EOL}${os.EOL}`);

        if (samplesContent.file) {
          sampleContents.push(`\`\`\`${topic.type}${os.EOL}`);
          const nut = fsCore.readFileSync(path.join(__dirname, samplesContent.file)).toString();
          const replacedNut = replaceImports(nut);
          sampleContents.push(`${replacedNut}${os.EOL}`);
          sampleContents.push(`\`\`\`${os.EOL}${os.EOL}`);
        }

        if (samplesContent.script) {
          sampleContents.push(`\`\`\`${topic.type}${os.EOL}`);
          for (let line of samplesContent.script) {
            sampleContents.push(`${line}${os.EOL}`);
          }
          sampleContents.push(`\`\`\`${os.EOL}${os.EOL}`);
        }
      }
    } else {
      // Assume inline if not bash or typescript topic type.
      const title = topic.title;
      const titleLink = title.replace(/\s+/g, '-').toLowerCase();
      tableOfContents.push(`* [${title}](#${titleLink})${os.EOL}`);
      const inlineContent = topic.content as string[];
      for (let line of inlineContent) {
        sampleContents.push(`${line}${os.EOL}`);
      }
    }
  }

  const samplesFileContent = [...tableOfContents, ...sampleContents];
  const samplesFilePath = path.join(process.cwd(), 'SAMPLES.md');
  fsCore.writeFileSync(samplesFilePath, samplesFileContent.join(''));
})();
