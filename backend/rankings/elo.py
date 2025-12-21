class EloRatingSystem:
    K_FACTOR = 32

    @staticmethod
    def calculate_new_ratings(rating_a, rating_b, result):
        """
        Calculates new ratings for two players/listings.
        result: 'A' if A won, 'B' if B won, 'TIE' if it was a tie.
        Returns (new_rating_a, new_rating_b)
        """
        expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
        expected_b = 1 / (1 + 10 ** ((rating_a - rating_b) / 400))

        if result == 'A':
            score_a = 1
            score_b = 0
        elif result == 'B':
            score_a = 0
            score_b = 1
        else: # TIE
            score_a = 0.5
            score_b = 0.5

        new_rating_a = rating_a + EloRatingSystem.K_FACTOR * (score_a - expected_a)
        new_rating_b = rating_b + EloRatingSystem.K_FACTOR * (score_b - expected_b)

        return new_rating_a, new_rating_b
