import yaml
import pandas as pd

kunnat_csv = "kuntaluettelo-suppeat-tiedot-2021-01-01.csv"

df = pd.read_csv(kunnat_csv, sep=";")
df.columns = ['id', 'fi', 'sv', 'maakunta_id', 'maakunta']

def new_example(text, entity, value):
    text = f'[{text}]{{"entity": "{entity}", "value": "{value}"}}'
    return {"text": text}

def new_intent(intent, examples):
    return {"intent": intent,
            "examples": examples}

examples = []
gazettes = set()

entity = "kunta"
intent = entity

for index, row in df.iterrows():
    examples.append(new_example(row.fi, entity, row.fi))
    examples.append(new_example(row.sv, entity, row.fi))
    gazettes.add(row.fi)
    gazettes.add(row.sv)

intents = [new_intent(intent, examples)]
nlu = {"nlu": intents}
output_file = 'nlu_kunnat.yml'
with open(output_file, 'w') as f:
    print(yaml.dump(nlu, width=1000), file=f)
    print(f'Wrote {output_file}')

gazette = [{'gazette': entity,
            'examples': list(gazettes)}]
output_file = 'gazette.yml'
with open(output_file, 'w') as f:
    print(yaml.dump(gazette, width=1000), file=f)
    print(f'Wrote {output_file}')
