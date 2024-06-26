import axios from 'axios';
import { useState, useEffect } from 'react';
import Lottie from 'react-lottie';

import LoadingAnim from '../assets/animation/loading animation.json';
import Carousel from '../components/Carousel';
import GalleryLayout from '../components/GalleryLayout';
import GenPicker from '../components/GenPicker';
import Modal from '../components/Modal';
import ModalCard from '../components/ModalCard';
import ModalCardMobile from '../components/ModalCardMobile';
import Pagination, { PageChangeHandlerProps } from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import TypePicker from '../components/TypePicker';
import useDebounce from '../hooks/useDebounce';
import { Pokemon, FilterHandlerProps, ModalHandlerProps } from '../types';

const defaultPokemon = {
  name: '',
  id: '',
  sprites: {
    other: {
      home: {
        front_default: '',
      },
      'official-artwork': {
        front_default: '',
      },
    },
  },
  flavor_text_entries: [{ flavor_text: '', language: { name: '', url: '' } }],
  is_legendary: false, // species
  is_mythical: false,
  types: [
    {
      slot: 0,
      type: {
        name: '',
        url: '',
      },
    },
  ],
  height: 0,
  weight: 0,
  stats: [{ base_stat: 0, effort: 0, stat: { name: '', url: '' } }],
  abilities: [
    {
      ability: { name: '', url: '' },
      is_hidden: false,
      base_experience: 0,
    },
  ],
  chain: {
    evolution_details: [''],
    evolves_to: [
      {
        evolution_details: [''],
        evolves_to: [
          {
            evolution_details: [''],
            evolves_to: [{}],
            is_baby: false,
            species: { name: '', url: '' },
          },
        ],
        is_baby: false,
        species: { name: '', url: '' },
      },
    ],
    is_baby: false,
    species: { name: '', url: '' },
  }, // species + evolution-chain
  habitat: { name: '', url: '' }, // species
  moves: [],
};

const Gallery = () => {
  const [searchPokemonName, setSearchPokemonName] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState('none');
  const [currentType, setCurrentType] = useState('normal');
  const [currentGen, setCurrentGen] = useState(1);
  const [count, setCount] = useState(0);
  const [pokemonList, setPokemonList] = useState<Array<Pokemon>>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisibility, setModalVisibility] = useState(false);
  const [modalPokemonName, setModalPokemonName] = useState('bulbasaur');
  const [modalPokemon, setModalPokemon] = useState<Array<Pokemon>>([defaultPokemon]);
  const [modalLoading, setModalLoading] = useState(true);

  const typeArray: Array<string> = [
    'normal',
    'fighting',
    'flying',
    'grass',
    'fire',
    'water',
    'electric',
    'ice',
    'rock',
    'ground',
    'steel',
    'poison',
    'bug',
    'psychic',
    'dark',
    'ghost',
    'dragon',
    'fairy',
  ];
  const genArray: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const AnimOptions = {
    loop: true,
    autoplay: true,
    animationData: LoadingAnim,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const countPerPage = 12;
  const offset = (currentPage - 1) * countPerPage;

  const filterHandler: FilterHandlerProps = {
    getCurrentFilter: () => {
      return currentFilter;
    },
    getCurrentType: () => {
      return currentType;
    },
    getCurrentGen: () => {
      return currentGen;
    },
    changeCurrentFilter: (filter) => setCurrentFilter(filter),
    changeCurrentType: (type) => setCurrentType(type),
    changeCurrentGen: (gen) => setCurrentGen(gen),
    changeSearchPokemon: (name) => setSearchPokemonName(name),
  };

  const countLimiter = (estimatedCount: number): number => {
    if (estimatedCount > count) return count;
    return estimatedCount;
  };

  const pageChangeHandler: PageChangeHandlerProps = {
    getCurrentPage: () => {
      return currentPage;
    },
    changePage: (toPage) => setCurrentPage(toPage),
    changePreviousPage: () => setCurrentPage(currentPage - 1),
    changeNextPage: () => setCurrentPage(currentPage + 1),
  };

  const modalHandler: ModalHandlerProps = {
    getVisibility: () => {
      return modalVisibility;
    },
    turnOff: () => setModalVisibility(false),
    turnOn: () => setModalVisibility(true),
    fetchName: (name) => setModalPokemonName(name),
    getModalPokemon: () => {
      return modalPokemon;
    },
    getModalLoading: () => {
      return modalLoading;
    },
  };

  const fetchPokemonList = async () => {
    const { data: fetchResults } = await axios.get<{
      count: number;
      results: Array<{ url: string; name: string }>;
    }>(`https://pokeapi.co/api/v2/pokemon/?offset=${offset}&limit=${countPerPage}`);

    setCount(fetchResults.count);
    return Promise.all<Array<Promise<Pokemon>>>(
      fetchResults.results.map(async (pokeInfo) => {
        return (await axios.get<Pokemon>(pokeInfo.url)).data;
      })
    );
  };

  const fetchPokemonListByGen = async () => {
    const { data: fetchResults } = await axios.get<{
      pokemon_species: Array<{ name: string; url: string }>;
    }>(`https://pokeapi.co/api/v2/generation/${currentGen}`);

    setCount(fetchResults.pokemon_species.length);
    const settledResults = await Promise.allSettled<Array<Promise<Pokemon>>>(
      fetchResults.pokemon_species
        .slice(offset, countLimiter(currentPage * countPerPage))
        .map(async (pokeInfo) => {
          return (await axios.get<Pokemon>(`https://pokeapi.co/api/v2/pokemon/${pokeInfo.name}`))
            .data;
        })
    );
    return settledResults
      .map((settledResult) => {
        if (settledResult.status === 'fulfilled') return settledResult.value;
        return null;
      })
      .filter((pokemon) => pokemon !== null);
  };

  const fetchPokemonByName = async (name: string) => {
    const fetchByName = async () => {
      return (await axios.get<Pokemon>(`https://pokeapi.co/api/v2/pokemon/${name}`)).data;
    };
    return Promise.all<Array<Promise<Pokemon>>>([fetchByName()]);
  };

  const debouncedSearch = useDebounce(searchPokemonName, 2000);

  const fetchPokemonListByType = async () => {
    const { data: fetchResults } = await axios.get<{
      pokemon: Array<{ pokemon: { name: string; url: string }; slot: number }>;
    }>(`https://pokeapi.co/api/v2/type/${currentType}`);

    setCount(fetchResults.pokemon.length);
    return Promise.all<Array<Promise<Pokemon>>>(
      fetchResults.pokemon
        .slice(offset, countLimiter(currentPage * countPerPage))
        .map(async (pokeInfo) => {
          return (await axios.get<Pokemon>(pokeInfo.pokemon.url)).data;
        })
    );
  };

  const fetchModalPokemon = async () => {
    const fetchFromPokemon = async () => {
      return (await axios.get<Pokemon>(`https://pokeapi.co/api/v2/pokemon/${modalPokemonName}`))
        .data;
    };
    const fetchFromPokemonSpecies = async () => {
      return (
        await axios.get<Pokemon>(`https://pokeapi.co/api/v2/pokemon-species/${modalPokemonName}`)
      ).data;
    };
    const fetchFromEvolutionchain = async () => {
      const { data: fetchResults } = await axios.get<{ evolution_chain: { url: string } }>(
        `https://pokeapi.co/api/v2/pokemon-species/${modalPokemonName}`
      );
      return (await axios.get<Pokemon>(fetchResults.evolution_chain.url)).data;
    };

    return Promise.all<Array<Promise<Pokemon>>>([
      fetchFromPokemon(),
      fetchFromPokemonSpecies(),
      fetchFromEvolutionchain(),
    ]);
  };

  const getPokemonList = async () => {
    if (currentFilter === 'type') {
      const fetchList = await fetchPokemonListByType();
      setPokemonList(fetchList);
    } else if (currentFilter === 'gen') {
      const fetchList = await fetchPokemonListByGen();
      setPokemonList(fetchList as Pokemon[]);
    } else {
      const fetchList = await fetchPokemonList();
      setPokemonList(fetchList);
    }
  };

  const getPokemonListByName = async () => {
    if (debouncedSearch !== undefined) {
      const fetchList = await fetchPokemonByName(debouncedSearch);
      setPokemonList(fetchList);
    }
  };

  const getModalPokemonInfo = async () => {
    setModalLoading(true);
    const ModalPokemonInfo = await fetchModalPokemon();
    setModalPokemon(ModalPokemonInfo);
    setModalLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    if (currentFilter !== 'name') {
      getPokemonList()
        .catch((error) => console.log(error))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentFilter, currentGen, currentType, debouncedSearch]);

  useEffect(() => {
    if (currentFilter === 'name') {
      getPokemonListByName()
        .catch((error) => console.log(error))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    getModalPokemonInfo().catch((error) => console.log(error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalPokemonName]);

  return (
    <div>
      <Modal modalHandler={modalHandler}>
        <ModalCardMobile modalPokemonInfo={modalPokemon} modalHandler={modalHandler} />
        <ModalCard modalPokemonInfo={modalPokemon} modalHandler={modalHandler} />
      </Modal>
      <div className='relative top-[5rem] flex flex-col gap-[4rem] px-[1.25rem] lg:px-[5rem] py-[2.5rem] items-center'>
        <SearchBar filterHandler={filterHandler} />
        <Carousel>
          {typeArray.map((type: string) => (
            <TypePicker
              key={type}
              type={type}
              currentType={filterHandler.getCurrentType()}
              currentFilter={filterHandler.getCurrentFilter()}
              onClick={() => {
                if (
                  filterHandler.getCurrentFilter() === 'type' &&
                  filterHandler.getCurrentType() === type
                ) {
                  filterHandler.changeCurrentFilter('none');
                  pageChangeHandler.changePage(1);
                } else {
                  filterHandler.changeCurrentFilter('type');
                  filterHandler.changeCurrentType(type);
                  pageChangeHandler.changePage(1);
                }
              }}
            />
          ))}
        </Carousel>
        <Carousel>
          {genArray.map((gen: number) => (
            <GenPicker
              key={gen}
              gen={gen}
              currentGen={filterHandler.getCurrentGen()}
              currentFilter={filterHandler.getCurrentFilter()}
              onClick={() => {
                if (
                  filterHandler.getCurrentFilter() === 'gen' &&
                  filterHandler.getCurrentGen() === gen
                ) {
                  filterHandler.changeCurrentFilter('none');
                  pageChangeHandler.changePage(1);
                } else {
                  filterHandler.changeCurrentFilter('gen');
                  filterHandler.changeCurrentGen(gen);
                  pageChangeHandler.changePage(1);
                }
              }}
            />
          ))}
        </Carousel>
        {loading && (
          <div className='w-100% h-[22.5rem] flex justify-center items-center'>
            <Lottie options={AnimOptions} height={200} width={200} />
          </div>
        )}
        {!loading && (
          <>
            <GalleryLayout pokemonList={pokemonList} modalHandler={modalHandler} />
            <Pagination
              count={count}
              countPerPage={countPerPage}
              pageChangeHandler={pageChangeHandler}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;
