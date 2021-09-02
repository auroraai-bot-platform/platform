import sys

default_path = 'testing/results_story/failed_test_stories.yml'

with open(default_path,'r') as f:
    line = f.read()
    if line == '# None of the test stories failed - all good!':
        print('story test passed')
    else:
        raise Exception('Story test resulted an error')
