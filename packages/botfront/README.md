# Python module for calling Botfront project import api (graphql)

This directory contains python module that can be used to import bot
configuration to Botfront through the Botfront graphql API. Example
usage:

```
from botfront.importer import run_import

response = run_import(
    url='http://localhost:8080/graphql',
    authorization="v8yvXSez6bf0FUOoL2vlYoTi22n0Yq8cy5i0-9Ct7dQ",
    user_id="%2232ddc56f-e559-5aef-bd57-bfb97381e275%22",
    project_id='3kquhKhqDChbRH7C4',
    files=['domain.yml', 'endpoints.yml'],
    only_validate=True,
    wipe_project=False,
    wipe_collections=False)

print(response.text)
```
