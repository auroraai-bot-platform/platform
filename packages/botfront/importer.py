import json
import requests

def read(path):
    with open(path) as f:
        return f.read()

def graphql_query():
    return """mutation ($projectId: String!, $files: [Upload]!, $onlyValidate: Boolean,
    $wipeInvolvedCollections: Boolean, $wipeProject: Boolean, $fallbackLang: String!)
{
    import(projectId: $projectId, files: $files, onlyValidate: $onlyValidate,
        wipeInvolvedCollections: $wipeInvolvedCollections, fallbackLang: $fallbackLang,
        wipeProject: $wipeProject)
    {
        fileMessages {
        errors {
            text
            longText
            __typename
        }

        warnings {
            text
            longText
            __typename
        }

        info {
            text
            longText
            __typename
        }

        conflicts
        filename
        __typename
    }

    summary {
        text
        longText
        __typename
    }

    __typename
    }
}"""

def create_map(files):
    num_files = len(files)
    items = [f'"{i}": ["variables.files.{i}"]' for i in range(num_files)]
    items_string = ", ".join(items)
    return f'{{{items_string}}}'

def create_operations(project_id, files, only_validate=True,
                      wipe_project=False, wipe_collections=False,
                      fallback_lang="fi"):
    operations = {
        "operationName": None,
        "query": graphql_query(),
        "variables": {
            "fallbackLang": fallback_lang,
            "files": [None] * len(files),
            "onlyValidate": only_validate,
            "projectId": project_id,
            "wipeInvolvedCollections": wipe_collections,
            "wipeProject": wipe_project
        }
    }
    return json.dumps(operations)

def run_import(url, authorization, user_id, project_id, files,
               only_validate=True, wipe_project=False, wipe_collections=False,
               fallback_lang="fi"):

    operations = create_operations(project_id, files, only_validate,
                                   wipe_project, wipe_collections,
                                   fallback_lang)
    map_string = create_map(files)

    # Important! Botfront requires that the 'filename' field is not set for
    # 'operations' and 'map'. Thus we explicitly set filename to None below.
    parts = {
        'operations': (None, operations),
        'map': (None, map_string)
    }

    # For actual files, Botfront requires the filename to be set, so that it
    # knows the file extension.
    for i, file in enumerate(files):
        parts[str(i)] = (file, read(file))

    headers = {
        "Authorization": authorization,
        "Cookie": f"ajs_user_id={user_id}"
    }

    response = requests.post(url, headers=headers, files=parts)
    return response
