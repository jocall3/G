import random
from collections import defaultdict

class ContentStrategySimulator:
    """
    A simulation model that allows the Architect to explore 'what-if' scenarios
    for content strategy, projecting potential reader engagement based on
    different topics and publishing cadences.

    This simulator models how content posts, with varying topics and frequencies,
    generate cumulative engagement over a specified duration, considering factors
    like topic appeal, audience fatigue, and content decay.
    """

    def __init__(self,
                 default_topics: dict = None,
                 default_cadences: dict = None,
                 engagement_params: dict = None):
        """
        Initializes the simulator with default topics, cadences, and engagement parameters.

        Args:
            default_topics (dict, optional): A dictionary defining content topics and their
                                             inherent engagement properties.
                                             Format: {topic_name: {'base_potential': float, 'decay_rate': float}}
                                             'base_potential': (0-100) inherent interest in the topic.
                                             'decay_rate': (0-1) daily rate at which a post's engagement fades.
            default_cadences (dict, optional): A dictionary defining publishing cadences
                                               and their associated properties.
                                               Format: {cadence_name: {'posts_per_week': float, 'fatigue_factor': float}}
                                             'posts_per_week': Average number of posts for this cadence per week.
                                             'fatigue_factor': (0-1) Multiplier reducing per-post engagement
                                                               due to higher publishing frequency (audience fatigue).
            engagement_params (dict, optional): Global parameters influencing engagement calculation.
                                                Format: {'random_noise_std_dev': float, 'base_daily_reach': float,
                                                         'engagement_per_reach_unit': float}
                                             'random_noise_std_dev': Standard deviation for random fluctuations
                                                                     in post engagement.
                                             'base_daily_reach': A conceptual baseline for daily audience exposure.
                                             'engagement_per_reach_unit': How much engagement is generated per
                                                                          unit of 'reach' and 'potential'.
        """
        self.topics = default_topics if default_topics is not None else self._get_default_topics()
        self.cadences = default_cadences if default_cadences is not None else self._get_default_cadences()
        self.engagement_params = engagement_params if engagement_params is not None else self._get_default_engagement_params()

    def _get_default_topics(self) -> dict:
        """
        Provides default content topics relevant to the project, with their
        base engagement potential and daily decay rates.
        """
        return {
            "AI Banking Innovation": {'base_potential': 85, 'decay_rate': 0.05},
            "My Entrepreneurial Journey": {'base_potential': 70, 'decay_rate': 0.03},
            "Code & Tech Vision": {'base_potential': 75, 'decay_rate': 0.04},
            "Legal & IP Strategy": {'base_potential': 60, 'decay_rate': 0.02},
            "Partnership Insights": {'base_potential': 65, 'decay_rate': 0.03},
            "Faith & Purpose": {'base_potential': 50, 'decay_rate': 0.01},
            "Open Banking Future": {'base_potential': 80, 'decay_rate': 0.04},
        }

    def _get_default_cadences(self) -> dict:
        """
        Provides default publishing cadences with their average posts per week
        and a fatigue factor.
        """
        return {
            "daily": {'posts_per_week': 7.0, 'fatigue_factor': 0.8},
            "bi-weekly": {'posts_per_week': 3.5, 'fatigue_factor': 0.9},
            "weekly": {'posts_per_week': 1.0, 'fatigue_factor': 1.0},
            "bi-monthly": {'posts_per_week': 0.5, 'fatigue_factor': 1.0},
        }

    def _get_default_engagement_params(self) -> dict:
        """
        Provides global engagement parameters for the simulation.
        """
        return {
            'random_noise_std_dev': 5.0,
            'base_daily_reach': 100.0,
            'engagement_per_reach_unit': 0.1
        }

    def add_topic(self, name: str, base_potential: float, decay_rate: float):
        """
        Adds a new content topic or updates an existing one.

        Args:
            name (str): The name of the topic.
            base_potential (float): Inherent interest (0-100).
            decay_rate (float): Daily rate of engagement decay (0-1).
        """
        if not (0 <= base_potential <= 100):
            raise ValueError("Base potential must be between 0 and 100.")
        if not (0 <= decay_rate <= 1):
            raise ValueError("Decay rate must be between 0 and 1.")
        self.topics[name] = {'base_potential': base_potential, 'decay_rate': decay_rate}

    def add_cadence(self, name: str, posts_per_week: float, fatigue_factor: float):
        """
        Adds a new publishing cadence or updates an existing one.

        Args:
            name (str): The name of the cadence.
            posts_per_week (float): Average number of posts per week for this cadence.
            fatigue_factor (float): Multiplier for per-post engagement (0-1).
        """
        if not (posts_per_week > 0):
            raise ValueError("Posts per week must be greater than 0.")
        if not (0 < fatigue_factor <= 1):
            raise ValueError("Fatigue factor must be between 0 and 1 (exclusive of 0).")
        self.cadences[name] = {'posts_per_week': posts_per_week, 'fatigue_factor': fatigue_factor}

    def _calculate_initial_post_engagement(self, topic_name: str, cadence_name: str) -> float:
        """
        Calculates the initial engagement score for a single post, factoring in
        topic potential and cadence-induced fatigue.
        """
        if topic_name not in self.topics:
            raise ValueError(f"Unknown topic: {topic_name}")
        if cadence_name not in self.cadences:
            raise ValueError(f"Unknown cadence: {cadence_name}")

        topic_info = self.topics[topic_name]
        cadence_info = self.cadences[cadence_name]
        params = self.engagement_params

        # Base engagement derived from topic potential, reach, and engagement efficiency
        base_engagement = (topic_info['base_potential'] / 100.0) * \
                          params['engagement_per_reach_unit'] * \
                          params['base_daily_reach']

        # Adjust for audience fatigue based on publishing frequency
        adjusted_engagement = base_engagement * cadence_info['fatigue_factor']

        # Add random noise for real-world variability
        noise = random.gauss(0, params['random_noise_std_dev'])
        final_engagement = max(0, adjusted_engagement + noise) # Engagement cannot be negative

        return final_engagement

    def run_simulation(self,
                       strategy: list[tuple[str, str]],
                       duration_days: int = 30,
                       seed: int = None) -> dict:
        """
        Runs a content strategy simulation over a specified duration.

        Args:
            strategy (list[tuple[str, str]]): A list of (topic_name, cadence_name) tuples
                                              representing the content plan. Each tuple defines
                                              a stream of content.
                                              Example: [("AI Banking Innovation", "weekly"),
                                                        ("My Entrepreneurial Journey", "bi-weekly")]
            duration_days (int): The total number of days to simulate.
            seed (int, optional): Seed for the random number generator to ensure
                                  reproducibility of simulation results.

        Returns:
            dict: A dictionary containing simulation results, including:
                  - 'total_projected_engagement': The sum of all daily engagement scores
                                                  over the simulation period.
                  - 'average_engagement_per_post': The total projected engagement divided
                                                   by the total number of posts published.
                  - 'posts_published': Total number of individual content pieces published.
                  - 'engagement_by_topic': A breakdown of cumulative engagement per topic.
                  - 'daily_engagement_timeline': A list of total engagement scores for each day.
        """
        if seed is not None:
            random.seed(seed)

        if not strategy:
            return {
                'total_projected_engagement': 0.0,
                'average_engagement_per_post': 0.0,
                'posts_published': 0,
                'engagement_by_topic': {},
                'daily_engagement_timeline': [0.0] * duration_days
            }

        daily_engagement_timeline = [0.0] * duration_days
        total_projected_engagement = 0.0
        posts_published = 0
        engagement_by_topic = defaultdict(float)

        # Stores active posts and their properties to calculate decaying engagement daily
        # Each item: (topic_name, initial_engagement, decay_rate, publish_day)
        active_posts = []

        for day in range(duration_days):
            current_day_total_engagement = 0.0

            # Determine and "publish" new posts for the current day
            for topic_name, cadence_name in strategy:
                cadence_info = self.cadences[cadence_name]
                posts_per_day_avg = cadence_info['posts_per_week'] / 7.0

                # Use a probabilistic approach for fractional posts per day
                if random.random() < posts_per_day_avg:
                    initial_post_engagement = self._calculate_initial_post_engagement(topic_name, cadence_name)
                    decay_rate = self.topics[topic_name]['decay_rate']
                    active_posts.append((topic_name, initial_post_engagement, decay_rate, day))
                    posts_published += 1

            # Calculate engagement from all active posts for the current day
            for topic_name, initial_engagement, decay_rate, publish_day in active_posts:
                days_since_publish = day - publish_day

                # Engagement decays exponentially over time
                # E_t = E_0 * (1 - decay_rate)^t
                current_post_daily_contribution = initial_engagement * (1 - decay_rate)**days_since_publish

                current_day_total_engagement += current_post_daily_contribution
                engagement_by_topic[topic_name] += current_post_daily_contribution # Accumulate for topic breakdown

            daily_engagement_timeline[day] = current_day_total_engagement
            total_projected_engagement += current_day_total_engagement

        average_engagement_per_post = total_projected_engagement / posts_published if posts_published > 0 else 0.0

        return {
            'total_projected_engagement': total_projected_engagement,
            'average_engagement_per_post': average_engagement_per_post,
            'posts_published': posts_published,
            'engagement_by_topic': dict(engagement_by_topic),
            'daily_engagement_timeline': daily_engagement_timeline
        }