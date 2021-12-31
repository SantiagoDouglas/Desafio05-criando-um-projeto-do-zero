import Head from 'next/head'
import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client'
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale';

import Header from '../../components/Header/index'
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      headling: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  )

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.headling.split(' ').length;

    const words = contentItem.body.map(item => item.text.split(' ').length)
    
    words.map(word => (total += word))

    return total;
  }, 0)

  const readTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <Header />      
      <img src={post.data.banner.url} alt='banner' className={styles.banner}/>
      <main className={commonStyles.container} >
        <div className={styles.post}>
          <h1>{post.data.title}</h1>
            <ul>
              <FiCalendar /><li>{formattedDate}</li>
              <FiUser /><li>{post.data.author}</li>
              <FiClock /><li>{`${readTime} min`}</li>
            </ul>
        </div>

        {post.data.content.map(content => {
          return (
            <article key={content.headling} className={styles.content}>
              <h2>{content.headling}</h2>
              <div 
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          )
        })}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    }
  })

  return {
    paths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();  
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          headling: content.headling,
          body: [...content.body]
        }
      }),
    },
  };

  return {
    props: {
      post,
    }
  }
};
