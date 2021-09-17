import logging
import argparse
import os
import sys
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.INFO)

SUPPORTED_LANGUAGES = ['fi','en','se']

base_path = str(Path(__file__).parents[1])
story_tests_path = os.path.join(base_path,'tests')


def story_test(language:list = None):
    ''' Executes story tests for given languages. If there exists no tests
    for a language, error is raised.
    
    Args:
        language: list of languages that are tested.

    '''
    
    story_files = get_story_files()
    supported_story_files = validate_language(story_files)

    if not intersection(supported_story_files.keys(), language):
        logger.error('no tests found for languages: {language}')
        sys.exit()
        
    for key, value in supported_story_files.items():
        if key in language:
            logger.info(f'running test for language {key}')
            
            test_path = os.path.join(story_tests_path, 
                                     supported_story_files[key])
            
            results_path = os.path.join(base_path, 
                                        f'testing/results_story_{key}')
    
            os.system(f'rasa test core --stories {test_path} \
                          --model app/models \
                          --out {results_path}')   
                          
            validate_stories(results_path, key)


def validate_stories(results_path:str, language:list):
    ''' Validates that story test will not have errors.
    
    Args:
        result_path: path to the story test result.
        
    Raises:
        Exception: when errors occur in tests.
        
    '''
    
    file_path = os.path.join(results_path,'failed_test_stories.yml')
    
    with open(file_path,'r') as f:
        line = f.read()
        if line == '# None of the test stories failed - all good!':
            logger.info(f'story test passed for language {language}')
        else:
            raise Exception('Story test error for language {language}.')


def get_story_files():
    ''' Lists and returns all story files that are valid. '''
    
    all_files = os.listdir(story_tests_path) 
    story_files = list(
        filter(is_story_testfile, os.listdir(story_tests_path))
    )

    return story_files

    
def is_story_testfile(file:str):
    ''' Checks wheteher a file is a story file.'''    
    
    if file.startswith('test_') and file.endswith('_stories.yml'):
        return True


def is_supported_language(file:str):
    ''' Checks that a story file is among supported languages, and returns
        language and file when supported.       
    '''
    
    for language in SUPPORTED_LANGUAGES:
        if file == f'test_{language}_stories.yml':
            return language, file

    
def validate_language(files:list):
    ''' Validates that file language is supported, and returns dict with
    language as key and file name as value.
    '''    
    
    matched = dict()
    for file in files:
        key, value = is_supported_language(file)
        matched[key] = value
    return matched


def intersection(lst1, lst2):
    return list(set(lst1) & set(lst2))


def parse_input():
    ''' Parser definitions for the main file run arguments. '''
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--language',
                        '--l',
                        help = 'Give language of the model and test case',
                        nargs = '+',
                        default = SUPPORTED_LANGUAGES)

    parsed = parser.parse_args()
    
    for language in parsed.language:
        if language not in SUPPORTED_LANGUAGES:
            print(f'no support for language: {language}')
            sys.exit()
            
    return parsed.language


if __name__ == '__main__':
    test_language = parse_input()
    story_test(test_language)