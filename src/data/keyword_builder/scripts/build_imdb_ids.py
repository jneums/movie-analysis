# -*- coding: utf-8 -*-
import logging
from pathlib import Path
import pandas as pd
from dotenv import find_dotenv, load_dotenv
import os

def main():
    """ Runs data processing script for building list of imdb_titles
    """
    logger = logging.getLogger(__name__)
    logger.info('making list of imdb_titles')

    # import data dependencies
    input_path = os.path.join(project_dir, '../../', 'data', 'interim', 'money.csv')
    titles = pd.read_csv(input_path)

    imdb_ids = list(titles['imdb_id'].values)[:-1]
    logger.info('Our list contains {} unique imdb ids'.format(len(imdb_ids))) 


    output_path = os.path.join(project_dir, 'keyword_builder', 'imdb_ids.txt')

    with open(output_path, 'w') as f:
        for imdb_id in imdb_ids:
            if type(imdb_id) == float:
                print(imdb_id)
            else:
                f.write(imdb_id + '\s')
        
    logger.info('IMDB Ids copied into {}'.format(output_path)) 



if __name__ == '__main__':
    log_fmt = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    logging.basicConfig(level=logging.INFO, format=log_fmt)

    # not used in this stub but often useful for finding various files
    project_dir = Path(__file__).resolve().parents[2]

    # find .env automagically by walking up directories until it's found, then
    # load up the .env entries as environment variables
    load_dotenv(find_dotenv())

    main()