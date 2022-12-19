from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionTest(Action):
    """
    Custom action for testing
    """
    def name(self):
        return 'action_test'

    def run(self,
           dispatcher: CollectingDispatcher,
           tracker: Tracker,
           domain):
        dispatcher.utter_message('Action toimii')
        return[]